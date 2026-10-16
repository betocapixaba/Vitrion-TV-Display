import React from 'react';
import {
  Tv2,
  ListVideo,
  Film,
  Building2,
  Megaphone,
  Settings,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';
import { AdminSection } from '../adminNavigation';

interface SectionOverviewProps {
  onNavigate: (section: AdminSection, hash: string) => void;
}

export function SectionOverview({ onNavigate }: SectionOverviewProps) {
  const cards = [
    {
      id: 'screens' as AdminSection,
      hash: '#/admin/screens',
      title: 'Telas & Dispositivos',
      description: 'Gerenciamento de pontos de exibição, pareamento e monitoramento de status online.',
      icon: Tv2,
      metric: '0 telas cadastradas',
      status: 'Pronto para Fase C',
      accent: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      id: 'playlists' as AdminSection,
      hash: '#/admin/playlists',
      title: 'Playlists',
      description: 'Criação e ordenação de grades de veiculação com transições e regras de exibição.',
      icon: ListVideo,
      metric: '1 playlist offline local',
      status: 'Planejado para Fase D',
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'media' as AdminSection,
      hash: '#/admin/media',
      title: 'Biblioteca de Mídia',
      description: 'Upload de imagens e vídeos, verificação de cache e validação de formatos.',
      icon: Film,
      metric: 'Armazenamento IndexedDB',
      status: 'Planejado para Fase D',
      accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'establishments' as AdminSection,
      hash: '#/admin/establishments',
      title: 'Estabelecimentos',
      description: 'Organização de pontos comerciais, franquias e associação com telas instaladas.',
      icon: Building2,
      metric: 'Multi-locais',
      status: 'Módulo estruturado',
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'campaigns' as AdminSection,
      hash: '#/admin/campaigns',
      title: 'Campanhas & Anúncios',
      description: 'Programação por agendamento de horário, frequência e relatórios de veiculação.',
      icon: Megaphone,
      metric: 'Prioridade e slots',
      status: 'Planejado para Fase E',
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'settings' as AdminSection,
      hash: '#/admin/settings',
      title: 'Configurações',
      description: 'Parâmetros globais, intervalos de heartbeat, regras de sincronização e segurança.',
      icon: Settings,
      metric: 'Preferências do sistema',
      status: 'Módulo estruturado',
      accent: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-950/30 via-[#0e121e] to-[#0d101a] p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Fase B Concluída
              </span>
              <span className="text-xs text-slate-400">• Fundação Visual do Dashboard</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Painel Administrativo Vitrion Digital Signage
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Estrutura de gestão isolada para desktop web. O runtime da Smart TV, seus loops de
              reprodução e o wake-lock permanecem estritamente restritos à rota de exibição de TV.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Isolamento Ativo</span>
              </div>
              <p className="text-[11px] text-slate-400">TV Runtime Inativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Módulo Ativo</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">Dashboard</div>
          <p className="text-[11px] text-slate-400 mt-1">Ambiente Desktop Administrativo</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Navegação Rápida</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">7 Módulos</div>
          <p className="text-[11px] text-slate-400 mt-1">Telas, Mídias, Playlists, etc.</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Roteamento Hash</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono text-base pt-1">/#/admin</div>
          <p className="text-[11px] text-slate-400 mt-1">Compatível sem servidor</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Próxima Etapa</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">Fase C</div>
          <p className="text-[11px] text-slate-400 mt-1">Gestão e Pareamento de Telas</p>
        </div>
      </div>

      {/* Grid of Sections */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3 tracking-wide">
          Módulos Administrativos do Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigate(card.id, card.hash)}
                className="rounded-xl border border-slate-800 bg-[#0d101a] hover:bg-[#111422] hover:border-slate-700 p-5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg border ${card.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {card.status}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-white group-hover:text-sky-300 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] font-medium text-slate-400">{card.metric}</span>
                  <div className="flex items-center gap-1 text-sky-400 group-hover:translate-x-1 transition-transform">
                    <span>Acessar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
