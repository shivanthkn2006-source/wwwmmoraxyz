import { motion } from 'framer-motion';
import { Car, Utensils, User, Clock, MapPin, Check, X } from 'lucide-react';

interface AgentTicketProps {
  type: 'cab' | 'food';
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface TicketDetails {
  agent: string;
  eta: string;
  item: string;
  status: string;
}

interface TicketConfig {
  icon: typeof Car;
  title: string;
  subtitle: string;
  details: TicketDetails;
}

const ticketData: Record<'cab' | 'food', TicketConfig> = {
  cab: {
    icon: Car,
    title: 'TRANSPORT VECTOR',
    subtitle: 'Autonomous Pod Inbound',
    details: {
      agent: 'UNIT-7X9',
      eta: '3 min',
      item: 'Tesla Cybercab',
      status: 'Optimized via Needlecast'
    }
  },
  food: {
    icon: Utensils,
    title: 'SUSTENANCE PROTOCOL',
    subtitle: 'Nutrient Delivery Active',
    details: {
      agent: 'DRONE-42K',
      eta: '12 min',
      item: 'Protein Pack #7',
      status: 'Synthesizing...'
    }
  }
};

export default function AgentTicket({ type, onConfirm, onCancel }: AgentTicketProps) {
  const data = ticketData[type];
  const Icon = data.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-pink-500/10 border border-cyan-500/30 overflow-hidden"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      {/* Header */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-mono font-bold text-cyan-400 tracking-wider">
            {data.title}
          </h3>
          <p className="text-xs font-mono text-white/50">
            {data.subtitle}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="relative grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-white/40" />
          <span className="text-xs font-mono text-white/70">{data.details.agent}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white/40" />
          <span className="text-xs font-mono text-cyan-400">{data.details.eta}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white/40" />
          <span className="text-xs font-mono text-white/70">{data.details.item}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/50">{data.details.status}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-mono text-sm font-bold flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          CONFIRM
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          className="py-2 px-4 rounded-lg bg-white/5 border border-white/10 text-white/70 font-mono text-sm flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Pulse Border */}
      <div className="absolute inset-0 rounded-xl border-2 border-cyan-400/50 pointer-events-none animate-gpu-pulse-opacity" />
    </motion.div>
  );
}
