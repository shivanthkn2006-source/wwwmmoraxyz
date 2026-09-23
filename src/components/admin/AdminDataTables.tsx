/**
 * ADMIN DATA TABLES — real users, sessions, events and reminders.
 *
 * Every row comes from the database under the root-admin read rules. Each table
 * can be filtered by text and sorted by any column, like the Calendar filters,
 * and the admin can add, change or remove records from here.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PLANNING_SYNC_EVENT, notifyPlanningChanged } from '@/lib/planningSync';

type Row = Record<string, string | number | null>;

interface Column {
  key: string;
  label: string;
}

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'datetime-local' | 'password' | 'email';
  createOnly?: boolean;
}

interface TableSpec {
  id: string;
  label: string;
  table: string;
  select: string;
  order: string;
  ascending?: boolean;
  columns: Column[];
  fields: Field[];
  map: (raw: Record<string, unknown>) => Row;
}

const text = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));
const stamp = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 16).replace('T', ' ');
};

const SPECS: TableSpec[] = [

  {
    id: 'users',
    label: 'Users',
    table: 'profiles',
    select: 'user_id, username, display_name, created_at',
    order: 'created_at',
    columns: [
      { key: 'username', label: 'Username' },
      { key: 'display_name', label: 'Name' },
      { key: 'created_at', label: 'Joined' },
    ],
    fields: [
      { key: 'email', label: 'Email (new account only)', type: 'email', createOnly: true },
      { key: 'password', label: 'Password (new account only)', type: 'password', createOnly: true },
      { key: 'username', label: 'Username' },
      { key: 'display_name', label: 'Name' },
      { key: 'city', label: 'City' },
      { key: 'status', label: 'Status' },
    ],
    map: (r) => ({
      id: text(r.user_id),
      username: text(r.username),
      display_name: text(r.display_name),
      created_at: stamp(r.created_at),
    }),
  },
  {
    id: 'sessions',
    label: 'Sessions',
    table: 'user_sessions',
    select: 'id, user_id, device_type, browser, country, started_at',
    order: 'started_at',
    columns: [
      { key: 'device_type', label: 'Device' },
      { key: 'browser', label: 'Browser' },
      { key: 'country', label: 'Country' },
      { key: 'started_at', label: 'Started' },
    ],
    fields: [
      { key: 'user_id', label: 'Member id' },
      { key: 'device_type', label: 'Device' },
      { key: 'browser', label: 'Browser' },
      { key: 'country', label: 'Country' },
      { key: 'started_at', label: 'Started', type: 'datetime-local' },
    ],
    map: (r) => ({
      id: text(r.id),
      device_type: text(r.device_type),
      browser: text(r.browser),
      country: text(r.country),
      started_at: stamp(r.started_at),
    }),
  },
  {
    id: 'events',
    label: 'Events',
    table: 'user_activity_log',
    select: 'id, activity_type, created_at',
    order: 'created_at',
    columns: [
      { key: 'activity_type', label: 'Event' },
      { key: 'created_at', label: 'When' },
    ],
    fields: [
      { key: 'user_id', label: 'Member id' },
      { key: 'activity_type', label: 'Event' },
    ],
    map: (r) => ({ id: text(r.id), activity_type: text(r.activity_type), created_at: stamp(r.created_at) }),
  },
  {
    id: 'planner',
    label: 'Planner events',
    table: 'important_dates',
    select: 'id, title, date_type, date_value, is_recurring',
    order: 'date_value',
    ascending: true,
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'date_type', label: 'Type' },
      { key: 'date_value', label: 'Date' },
      { key: 'is_recurring', label: 'Repeats' },
    ],
    fields: [
      { key: 'user_id', label: 'Member id' },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Details' },
      { key: 'date_type', label: 'Type' },
      { key: 'date_value', label: 'Date', type: 'date' },
    ],
    map: (r) => ({
      id: text(r.id),
      title: text(r.title),
      date_type: text(r.date_type),
      date_value: text(r.date_value),
      is_recurring: r.is_recurring ? 'yearly' : 'no',
    }),
  },
  {
    id: 'reminders',
    label: 'Smart Reminders',
    table: 'reminders',
    select: 'id, title, category, reminder_time, is_completed',
    order: 'reminder_time',
    ascending: true,
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'reminder_time', label: 'Due' },
      { key: 'is_completed', label: 'Status' },
    ],
    fields: [
      { key: 'user_id', label: 'Member id' },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Details' },
      { key: 'category', label: 'Category' },
      { key: 'reminder_time', label: 'Due', type: 'datetime-local' },
    ],
    map: (r) => ({
      id: text(r.id),
      title: text(r.title),
      category: text(r.category),
      reminder_time: stamp(r.reminder_time),
      is_completed: r.is_completed ? 'done' : 'active',
    }),
  },
];

const PAGE_SIZE = 50;

const DataTable: React.FC<{ spec: TableSpec }> = ({ spec }) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState(spec.columns[spec.columns.length - 1].key);
  const [ascending, setAscending] = useState(Boolean(spec.ascending));
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ mode: 'create' | 'update'; row: Row | null } | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const client = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data, error: queryError } = await client
      .from(spec.table)
      .select(spec.select)
      .order(spec.order, { ascending: Boolean(spec.ascending) })
      .limit(PAGE_SIZE);
    setError(queryError ? 'No access to these rows.' : null);
    setRows(queryError ? [] : (data || []).map(spec.map));
    setLoading(false);
  }, [spec]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener(PLANNING_SYNC_EVENT, refresh);
    return () => window.removeEventListener(PLANNING_SYNC_EVENT, refresh);
  }, [load]);

  const callAdmin = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error: fnError } = await supabase.functions.invoke('admin-records', { body: payload });
    const failure = (data as { error?: string } | null)?.error;
    if (fnError || failure) throw new Error(failure || fnError?.message || 'The change could not be saved.');
  }, []);

  const openCreate = () => {
    setDraft({});
    setEditing({ mode: 'create', row: null });
  };

  const openEdit = (row: Row) => {
    const next: Record<string, string> = {};
    spec.fields.forEach((field) => {
      if (field.createOnly) return;
      const value = row[field.key];
      next[field.key] = value === null || value === undefined ? '' : String(value);
    });
    setDraft(next);
    setEditing({ mode: 'update', row });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const values: Record<string, string> = {};
      spec.fields.forEach((field) => {
        if (field.createOnly) return;
        const value = (draft[field.key] || '').trim();
        if (value) values[field.key] = value;
      });
      await callAdmin({
        action: editing.mode,
        entity: spec.id,
        id: editing.row?.id ? String(editing.row.id) : undefined,
        email: draft.email,
        password: draft.password,
        values,
      });
      toast.success(editing.mode === 'create' ? 'Record added.' : 'Record updated.');
      setEditing(null);
      notifyPlanningChanged(spec.id === 'reminders' ? 'reminders' : 'planner');
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'The change could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    if (!row.id) return;
    if (!window.confirm(`Remove this ${spec.label.toLowerCase().replace(/s$/, '')} permanently?`)) return;
    try {
      await callAdmin({ action: 'delete', entity: spec.id, id: String(row.id) });
      toast.success('Record removed.');
      notifyPlanningChanged(spec.id === 'reminders' ? 'reminders' : 'planner');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'The record could not be removed.');
    }
  };

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const filtered = (rows || []).filter((row) =>
      !needle || spec.columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(needle)),
    );
    return [...filtered].sort((a, b) => {
      const left = String(a[sortKey] ?? '');
      const right = String(b[sortKey] ?? '');
      return ascending ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [rows, filter, sortKey, ascending, spec.columns]);

  const toggleSort = (key: string) => {
    if (key === sortKey) return setAscending((value) => !value);
    setSortKey(key);
    setAscending(true);
  };

  return (
    <div className="space-y-3" data-admin-table={spec.id}>
      <div className="flex items-center gap-2">
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={`Filter ${spec.label.toLowerCase()}…`}
          aria-label={`Filter ${spec.label}`}
          className="h-9"
        />
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> New
        </Button>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              {spec.columns.map((column) => (
                <th key={column.key} className="p-2 font-medium text-muted-foreground">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sortKey === column.key && (ascending
                      ? <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                  </button>
                </th>
              ))}
              <th className="p-2 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr><td className="p-3 text-muted-foreground" colSpan={spec.columns.length + 1}>Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td className="p-3 text-muted-foreground" colSpan={spec.columns.length + 1}>{error || 'Nothing to show.'}</td></tr>
            ) : (
              visible.map((row, index) => (
                <tr key={String(row.id ?? index)} className="border-t border-border/60">
                  {spec.columns.map((column) => (
                    <td key={column.key} className="p-2 text-foreground">{row[column.key] ?? '—'}</td>
                  ))}
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit record" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete record" onClick={() => void remove(row)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {visible.length} of the {PAGE_SIZE} most recent rows.
      </p>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.mode === 'create' ? `Add ${spec.label.toLowerCase()}` : `Edit ${spec.label.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {spec.fields
              .filter((field) => editing?.mode === 'create' || !field.createOnly)
              .map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`${spec.id}-${field.key}`} className="text-xs">{field.label}</Label>
                  <Input
                    id={`${spec.id}-${field.key}`}
                    type={field.type || 'text'}
                    value={draft[field.key] || ''}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminDataTables: React.FC = () => (
  <Card data-admin-data-tables>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold text-foreground">Platform records</CardTitle>
    </CardHeader>
    <CardContent>
      <Tabs defaultValue={SPECS[0].id}>
        <TabsList className="mb-4 flex w-full flex-wrap">
          {SPECS.map((spec) => (
            <TabsTrigger key={spec.id} value={spec.id}>{spec.label}</TabsTrigger>
          ))}
        </TabsList>
        {SPECS.map((spec) => (
          <TabsContent key={spec.id} value={spec.id} className="mt-0">
            <DataTable spec={spec} />
          </TabsContent>
        ))}
      </Tabs>
    </CardContent>
  </Card>
);

export default AdminDataTables;
