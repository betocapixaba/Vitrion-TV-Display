import React, { useState, useEffect, useMemo } from 'react';
import {
  Tv2,
  Plus,
  Search,
  Monitor,
  Building2,
  MapPin,
  Sparkles,
  Info,
  Copy,
  Check,
  Edit2,
  Trash2,
  Eye,
  Filter,
  RotateCcw,
  AlertCircle,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AdminScreenRecord,
  ScreenOperationalStatus,
  ScreenRecordType,
} from '../../../types/admin';
import {
  adminScreensStorage,
  ADMIN_SCREENS_STORAGE_KEY,
} from '../adminScreensStorage';
import { ScreenModal } from '../screens/ScreenModal';
import { ScreenDeleteModal } from '../screens/ScreenDeleteModal';
import { ScreenDetailsModal } from '../screens/ScreenDetailsModal';

export function SectionScreens() {
  // Screens state with lazy initializers
  const [screens, setScreens] = useState<AdminScreenRecord[]>(() => {
    return adminScreensStorage.loadScreens().state.records;
  });
  const [storageErrors, setStorageErrors] = useState<string[]>(() => {
    return adminScreensStorage.loadScreens().errors;
  });
  const [rawCorrupted, setRawCorrupted] = useState<boolean>(() => {
    return adminScreensStorage.loadScreens().rawCorrupted;
  });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ScreenOperationalStatus>('all');
  const [establishmentFilter, setEstablishmentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ScreenRecordType>('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<AdminScreenRecord | null>(null);
  const [deletingScreen, setDeletingScreen] = useState<AdminScreenRecord | null>(null);
  const [detailsScreen, setDetailsScreen] = useState<AdminScreenRecord | null>(null);

  // UI helpers
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showArchNotice, setShowArchNotice] = useState(true);

  // Browser TV profile detection
  const [detectedBrowserTv, setDetectedBrowserTv] = useState<{
    deviceId?: string;
    pairingCode?: string;
  } | null>(() => {
    return adminScreensStorage.readCurrentBrowserTVProfile();
  });

  // Reload screens from storage
  const loadData = () => {
    const result = adminScreensStorage.loadScreens();
    setScreens(result.state.records);
    setStorageErrors(result.errors);
    setRawCorrupted(result.rawCorrupted);

    const browserProfile = adminScreensStorage.readCurrentBrowserTVProfile();
    setDetectedBrowserTv(browserProfile);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check if browser TV pairing code is already linked in admin screens
  const isBrowserTvAlreadyLinked = useMemo(() => {
    if (!detectedBrowserTv?.pairingCode) return false;
    const targetCode = detectedBrowserTv.pairingCode.toUpperCase();
    return screens.some((s) => s.pairingCode.toUpperCase() === targetCode);
  }, [detectedBrowserTv, screens]);

  // Unique establishments list for filter dropdown
  const uniqueEstablishments = useMemo(() => {
    const set = new Set<string>();
    screens.forEach((s) => {
      if (s.establishmentName && s.establishmentName.trim()) {
        set.add(s.establishmentName.trim());
      }
    });
    return Array.from(set).sort();
  }, [screens]);

  // Filtered screens list
  const filteredScreens = useMemo(() => {
    return screens.filter((screen) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = screen.name.toLowerCase().includes(query);
        const matchesCode = screen.pairingCode.toLowerCase().includes(query);
        const matchesEst = screen.establishmentName.toLowerCase().includes(query);
        const matchesNotes = screen.locationNotes
          ? screen.locationNotes.toLowerCase().includes(query)
          : false;

        if (!matchesName && !matchesCode && !matchesEst && !matchesNotes) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && screen.status !== statusFilter) {
        return false;
      }

      // Establishment filter
      if (
        establishmentFilter !== 'all' &&
        screen.establishmentName !== establishmentFilter
      ) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && screen.recordType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [screens, searchQuery, statusFilter, establishmentFilter, typeFilter]);

  // Summary counts
  const stats = useMemo(() => {
    const total = screens.length;
    const active = screens.filter((s) => s.status === 'active').length;
    const pending = screens.filter((s) => s.status === 'pending').length;
    const demo = screens.filter((s) => s.status === 'offline_demo').length;
    return { total, active, pending, demo };
  }, [screens]);

  // Has active filters
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    establishmentFilter !== 'all' ||
    typeFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setEstablishmentFilter('all');
    setTypeFilter('all');
  };

  // Copy pairing code to clipboard
  const handleCopyCode = (code: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(code);
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Quick action: link detected browser TV
  const handleQuickLinkBrowserTv = () => {
    if (!detectedBrowserTv?.pairingCode) return;
    const res = adminScreensStorage.addScreen({
      pairingCode: detectedBrowserTv.pairingCode,
      name: 'TV deste Navegador',
      establishmentName: 'Dispositivo Local',
      locationNotes: 'Sessão atual do navegador',
      status: 'active',
      recordType: 'current_device',
      platform: 'browser',
      resolution: '1920x1080',
      orientation: 'landscape',
      telemetryNotice: 'Perfil de TV detectado no armazenamento local deste navegador',
    });

    if (res.success) {
      loadData();
    }
  };

  // Handlers for modal actions
  const handleOpenCreate = () => {
    setEditingScreen(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (screen: AdminScreenRecord) => {
    setEditingScreen(screen);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (screen: AdminScreenRecord) => {
    setDeletingScreen(screen);
  };

  const handleConfirmDelete = (id: string) => {
    adminScreensStorage.deleteScreen(id);
    loadData();
  };

  const handleScreenSaved = () => {
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Telas & Dispositivos</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Módulo de Gestão de Telas — Fase C
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gerenciamento local de pontos de exibição, códigos de pareamento de TVs e metadados operacionais.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Vincular Nova Tela</span>
        </button>
      </div>

      {/* Honest Architecture & Telemetry Notice */}
      {showArchNotice && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">
                Aviso de Arquitetura & Isolamento Local
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Os dados desta tela são mantidos exclusivamente no armazenamento local deste navegador
                (<code>{ADMIN_SCREENS_STORAGE_KEY}</code>) sem telemetria remota ativa nesta fase. O player da TV opera de forma independente e protegida.
                Sincronização remota via nuvem e telemetria em tempo real com TVs físicas em campo serão adicionadas em fases posteriores.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowArchNotice(false)}
            className="text-slate-500 hover:text-slate-300 text-xs shrink-0 p-1"
            title="Ocultar aviso"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Storage Errors Warning if any */}
      {storageErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Avisos do Armazenamento Local:</div>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-amber-300/90">
              {storageErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Quick Banner: Detected Local TV in this browser */}
      {detectedBrowserTv?.pairingCode && !isBrowserTvAlreadyLinked && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/40 via-purple-900/20 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="font-semibold text-white">
                Dispositivo de TV Local Detectado neste Navegador
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                Código de Pareamento:{' '}
                <strong className="font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800">
                  {detectedBrowserTv.pairingCode}
                </strong>
                {detectedBrowserTv.deviceId && (
                  <span className="text-slate-400 ml-2 hidden sm:inline font-mono">
                    (ID: {detectedBrowserTv.deviceId.substring(0, 14)}...)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleQuickLinkBrowserTv}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Vincular TV Deste Navegador</span>
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Screens */}
        <div className="p-4 rounded-xl bg-[#0d101a] border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium">Total de Telas</span>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Cadastradas localmente</span>
        </div>

        {/* Active Screens */}
        <div className="p-4 rounded-xl bg-[#0d101a] border border-slate-800/80">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ativas / Prontas
          </span>
          <div className="text-2xl font-bold text-white mt-1">{stats.active}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Em reprodução</span>
        </div>

        {/* Pending Screens */}
        <div className="p-4 rounded-xl bg-[#0d101a] border border-slate-800/80">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pendentes
          </span>
          <div className="text-2xl font-bold text-white mt-1">{stats.pending}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Aguardando código</span>
        </div>

        {/* Demo Screens */}
        <div className="p-4 rounded-xl bg-[#0d101a] border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Demonstração
          </span>
          <div className="text-2xl font-bold text-white mt-1">{stats.demo}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Exemplos offline</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3.5 rounded-xl bg-[#0d101a] border border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, código (VTR-XXXX), estabelecimento ou local..."
              className="w-full pl-9 pr-4 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-1"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ScreenOperationalStatus)}
              className="px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativas (Prontas)</option>
              <option value="pending">Pendentes</option>
              <option value="offline_demo">Demonstração</option>
            </select>

            {/* Establishment Filter */}
            <select
              value={establishmentFilter}
              onChange={(e) => setEstablishmentFilter(e.target.value)}
              className="px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="all">Todos os Estabelecimentos</option>
              {uniqueEstablishments.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>

            {/* Record Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | ScreenRecordType)}
              className="px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="all">Todos os Tipos</option>
              <option value="current_device">Este Navegador (TV Local)</option>
              <option value="custom_local">Local Administrativo</option>
              <option value="demo">Demonstração</option>
            </select>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>
              Exibindo <strong>{filteredScreens.length}</strong> de <strong>{screens.length}</strong> telas
            </span>
            <span className="text-slate-500">Filtros ativos</span>
          </div>
        )}
      </div>

      {/* Screen Records Listing */}
      {filteredScreens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0d101a]/50 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-3">
            <Tv2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">
            {hasActiveFilters ? 'Nenhuma tela encontrada' : 'Nenhuma tela cadastrada'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            {hasActiveFilters
              ? 'Nenhum dispositivo corresponde aos critérios de pesquisa ou filtros aplicados.'
              : 'Cadastre sua primeira tela administrativa ou vincule a TV deste navegador.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={handleClearFilters}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Limpar Filtros de Busca
            </button>
          ) : (
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              Cadastrar Nova Tela
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScreens.map((screen) => {
            const isBrowserDevice = screen.recordType === 'current_device';
            const isDemo = screen.recordType === 'demo';

            return (
              <div
                key={screen.id}
                className={`group relative rounded-xl border p-4 bg-[#0d101a] flex flex-col justify-between transition-all hover:border-slate-700 ${
                  isBrowserDevice
                    ? 'border-purple-500/40 bg-gradient-to-b from-[#131024] to-[#0d101a]'
                    : isDemo
                    ? 'border-slate-800/90'
                    : 'border-slate-800'
                }`}
              >
                {/* Card Top: Status & Record Type Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Status Badge */}
                    <div>
                      {screen.status === 'active' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Ativa (Pronta)
                        </span>
                      )}
                      {screen.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Pendente
                        </span>
                      )}
                      {screen.status === 'offline_demo' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Demonstração
                        </span>
                      )}
                    </div>

                    {/* Record Type Badge */}
                    <div>
                      {isBrowserDevice && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <Monitor className="w-3 h-3" />
                          TV deste Navegador
                        </span>
                      )}
                      {isDemo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Exemplo / Demo
                        </span>
                      )}
                      {screen.recordType === 'custom_local' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          Local Admin
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Screen Title & Pairing Code Bar */}
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                      {screen.name}
                    </h3>

                    {/* Pairing Code with Copy */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">
                        Código:
                      </span>
                      <div className="inline-flex items-center gap-1 bg-[#090b11] px-2 py-0.5 rounded border border-slate-800">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          {screen.pairingCode}
                        </span>
                        <button
                          onClick={() => handleCopyCode(screen.pairingCode)}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                          title="Copiar código de pareamento"
                          aria-label={`Copiar código ${screen.pairingCode}`}
                        >
                          {copiedCode === screen.pairingCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Establishment & Location Notes */}
                  <div className="space-y-1 text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-200 truncate">
                        {screen.establishmentName}
                      </span>
                    </div>
                    {screen.locationNotes && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{screen.locationNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Specs Tag */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {screen.resolution || '1920x1080'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {screen.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {screen.platform || 'browser'}
                    </span>
                  </div>

                  {/* Honest Telemetry Notice */}
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-800/60">
                    <Radio className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate" title={screen.telemetryNotice}>
                      {screen.telemetryNotice}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => setDetailsScreen(screen)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                    title="Ver detalhes completos"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(screen)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                      title="Editar metadados da tela"
                      aria-label={`Editar ${screen.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(screen)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Remover tela"
                      aria-label={`Remover ${screen.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Screen Create/Edit Modal */}
      <ScreenModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingScreen(null);
        }}
        onSaved={handleScreenSaved}
        editingScreen={editingScreen}
        existingScreens={screens}
        detectedLocalProfile={detectedBrowserTv}
      />

      {/* Screen Delete Confirmation Modal */}
      <ScreenDeleteModal
        isOpen={Boolean(deletingScreen)}
        screen={deletingScreen}
        onClose={() => setDeletingScreen(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Screen Full Details Modal */}
      <ScreenDetailsModal
        isOpen={Boolean(detailsScreen)}
        screen={detailsScreen}
        onClose={() => setDetailsScreen(null)}
        onEdit={(screen) => {
          setDetailsScreen(null);
          handleOpenEdit(screen);
        }}
      />
    </div>
  );
}
