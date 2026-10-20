import { AVATAR_CHOICES, DEFAULT_AVATAR, setAvatarChoice, useAvatarChoice } from '@/lib/vrAvatarChoice';
import { Button } from '@/components/ui/button';

export function VRAvatarPicker() {
  const choice = useAvatarChoice();
  return <div className="re-case-row">
    <div className="font-semibold">Avatar</div>
    <div className="flex flex-wrap gap-1" role="group" aria-label="Village avatar">
      {AVATAR_CHOICES.map((a) => <Button key={a.id} variant="ghost" size="sm" aria-pressed={choice === a.id} onClick={() => setAvatarChoice(a.id)}>
        {choice === a.id ? '✓ ' : ''}{a.name}{a.id === DEFAULT_AVATAR ? ' · Default' : ''}
      </Button>)}
    </div>
  </div>;
}