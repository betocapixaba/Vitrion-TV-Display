import React, { useState, useEffect } from 'react';
import {
  X,
  Tv2,
  AlertCircle,
  Check,
  Sparkles,
  Info,
  Monitor,
  Building2,
  MapPin,
} from 'lucide-react';
import {
  AdminScreenRecord,
  ScreenOperationalStatus,
  ScreenRecordType,
} from '../../../types/admin';
import {
  adminScreensStorage,
  validatePairingCodeFormat,
} from '../adminScreensStorage';

export interface ScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (screen: AdminScreenRecord) => void;
  editingScreen?: AdminScreenRecord | null;
  existingScreens: AdminScreenRecord[];
  detectedLocalProfile?: { deviceId?: string; pairingCode?: string } | null;
}

export function ScreenModal({
  isOpen,
  onClose,
  onSaved,
  editingScreen,
  existingScreens,
  detectedLocalProfile,
}: ScreenModalProps) {
  const isEditing = Boolean(editingScreen);

  // Form fields with initial fallback from editingScreen
  const [name, setName] = useState(editingScreen?.name || '');
  const [pairingCode, setPairingCode] = useState(editingScreen?.pairingCode || '');
  const [establishmentName, setEstablishmentName] = useState(editingScreen?.establishmentName || '');
  const [locationNotes, setLocationNotes] = useState(editingScreen?.locationNotes || '');
  const [status, setStatus] = useState<ScreenOperationalStatus>(editingScreen?.status || 'pending');
  const [recordType, setRecordType] = useState<ScreenRecordType>(editingScreen?.recordType || 'custom_local');
  const [platform, setPlatform] = useState<'firetv' | 'smarttv' | 'browser' | 'unknown'>(
    editingScreen?.platform || 'browser'
  );
  const [resolution, setResolution] = useState(editingScreen?.resolution || '1920x1080');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(
    editingScreen?.orientation || 'landscape'
  );
  const [telemetryNotice, setTelemetryNotice] = useState(
    editingScreen?.telemetryNotice || 'Painel Local (sem telemetria remota ativa)'
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form on open or change
  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);
    setIsSubmitting(false);

    if (editingScreen) {
      setName(editingScreen.name || '');
      setPairingCode(editingScreen.pairingCode || '');
      setEstablishmentName(editingScreen.establishmentName || '');
      setLocationNotes(editingScreen.locationNotes || '');
      setStatus(editingScreen.status || 'pending');
      setRecordType(editingScreen.recordType || 'custom_local');
      setPlatform(editingScreen.platform || 'unknown');
      setResolution(editingScreen.resolution || '1920x1080');
      setOrientation(editingScreen.orientation || 'landscape');
      setTelemetryNotice(
        editingScreen.telemetryNotice || 'Painel Local (sem telemetria remota ativa)'
      );
    } else {
      // New screen defaults
      setName('');
      setPairingCode('');
      setEstablishmentName('');
      setLocationNotes('');
      setStatus('pending');
      setRecordType('custom_local');
      setPlatform('browser');
      setResolution('1920x1080');
      setOrientation('landscape');
      setTelemetryNotice('Cadastrado no painel local (sem telemetria remota ativa)');
    }
  }, [isOpen, editingScreen]);

  if (!isOpen) return null;

  // Handle pairing code typing with automatic VTR- prefix format
  const handlePairingCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();
    // If user enters without VTR-, format if 4 chars
    setPairingCode(val);
  };

  const handleUseBrowserProfile = () => {
    if (detectedLocalProfile?.pairingCode) {
      setPairingCode(detectedLocalProfile.pairingCode);
      if (!name) setName('TV deste Navegador');
      setRecordType('current_device');
      setStatus('active');
      setPlatform('browser');
      setTelemetryNotice('TV local detectada no armazenamento deste navegador');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('O nome da tela / dispositivo é obrigatório.');
      return;
    }

    const trimmedCode = pairingCode.trim().toUpperCase();
    if (!trimmedCode) {
      setFormError('O código de pareamento é obrigatório.');
      return;
    }

    if (!validatePairingCodeFormat(trimmedCode)) {
      setFormError('Código de pareamento inválido. O formato exigido é VTR-XXXX (ex: VTR-8K2M).');
      return;
    }

    // Check duplicate code if creating or changing code
    const isCodeDuplicated = existingScreens.some((s) => {
      if (isEditing && editingScreen && s.id === editingScreen.id) {
        return false;
      }
      return s.pairingCode.toUpperCase() === trimmedCode;
    });

    if (isCodeDuplicated) {
      setFormError(`O código ${trimmedCode} já está em uso por outra tela cadastrada.`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editingScreen) {
        const updateRes = adminScreensStorage.updateScreen(editingScreen.id, {
          name: trimmedName,
          pairingCode: trimmedCode,
          establishmentName: establishmentName.trim() || 'Geral',
          locationNotes: locationNotes.trim() || undefined,
          status,
          recordType,
          platform,
          resolution,
          orientation,
          telemetryNotice: telemetryNotice.trim() || 'Painel local (sem telemetria remota ativa)',
        });

        if (!updateRes.success || !updateRes.record) {
          setFormError(updateRes.error || 'Falha ao atualizar dados da tela.');
          setIsSubmitting(false);
          return;
        }

        onSaved(updateRes.record);
        onClose();
      } else {
        const addRes = adminScreensStorage.addScreen({
          name: trimmedName,
          pairingCode: trimmedCode,
          establishmentName: establishmentName.trim() || 'Geral',
          locationNotes: locationNotes.trim() || undefined,
          status,
          recordType,
          platform,
          resolution,
          orientation,
          telemetryNotice: telemetryNotice.trim() || 'Cadastrado no painel local (sem telemetria remota ativa)',
        });

        if (!addRes.success || !addRes.record) {
          setFormError(addRes.error || 'Falha ao cadastrar nova tela.');
          setIsSubmitting(false);
          return;
        }

        onSaved(addRes.record);
        onClose();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="screen-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-[#0f131f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#141927]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Tv2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="screen-modal-title" className="text-base font-semibold text-white">
                {isEditing ? 'Editar Metadados da Tela' : 'Vincular Nova Tela Local'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `Atualizando registro: ${editingScreen?.name}`
                  : 'Cadastro de metadados no painel local (sem telemetria em tempo real)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick helper for browser TV profile */}
        {!isEditing && detectedLocalProfile?.pairingCode && pairingCode !== detectedLocalProfile.pairingCode && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                TV local detectada neste navegador (Código:{' '}
                <strong className="font-mono text-white">{detectedLocalProfile.pairingCode}</strong>).
              </span>
            </div>
            <button
              type="button"
              onClick={handleUseBrowserProfile}
              className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] shrink-0 transition-colors"
            >
              Usar dados locais
            </button>
          </div>
        )}

        {/* Error message */}
        {formError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Screen Name */}
            <div>
              <label htmlFor="screen-name-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Nome da Tela / Ponto <span className="text-rose-400">*</span>
              </label>
              <input
                id="screen-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: TV Recepção, Totem Entrada"
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                required
              />
            </div>

            {/* Pairing Code */}
            <div>
              <label htmlFor="pairing-code-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Código de Pareamento <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="pairing-code-input"
                  type="text"
                  value={pairingCode}
                  onChange={handlePairingCodeChange}
                  placeholder="VTR-XXXX"
                  maxLength={8}
                  className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs font-mono uppercase text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  required
                />
                {validatePairingCodeFormat(pairingCode) && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Formato obrigatório: VTR-XXXX</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Establishment */}
            <div>
              <label htmlFor="establishment-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Estabelecimento / Unidade <span className="text-rose-400">*</span>
              </label>
              <input
                id="establishment-input"
                type="text"
                value={establishmentName}
                onChange={(e) => setEstablishmentName(e.target.value)}
                placeholder="Ex: Farmácia Central, Matriz"
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                required
              />
            </div>

            {/* Location Notes */}
            <div>
              <label htmlFor="location-notes-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Localização Física / Ponto
              </label>
              <input
                id="location-notes-input"
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="Ex: Corredor A, Parede sobre os caixas"
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Operational Status */}
            <div>
              <label htmlFor="status-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Status Operacional
              </label>
              <select
                id="status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as ScreenOperationalStatus)}
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="active">Ativa (Pronta)</option>
                <option value="pending">Pendente (Aguardando Pareamento)</option>
                <option value="offline_demo">Demonstração Offline</option>
              </select>
            </div>

            {/* Record Type */}
            <div>
              <label htmlFor="record-type-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Tipo de Registro
              </label>
              <select
                id="record-type-select"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as ScreenRecordType)}
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="custom_local">Local Administrativo</option>
                <option value="current_device">Este Navegador (TV Local)</option>
                <option value="demo">Demonstração / Exemplo</option>
              </select>
            </div>

            {/* Platform */}
            <div>
              <label htmlFor="platform-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Plataforma / Dispositivo
              </label>
              <select
                id="platform-select"
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value as 'firetv' | 'smarttv' | 'browser' | 'unknown')
                }
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="browser">Navegador Web</option>
                <option value="firetv">Amazon Fire TV</option>
                <option value="smarttv">Smart TV (WebOS / Tizen)</option>
                <option value="unknown">Outro / Desconhecido</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Resolution */}
            <div>
              <label htmlFor="resolution-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Resolução da Tela
              </label>
              <select
                id="resolution-select"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="1920x1080">1920x1080 (Full HD 1080p)</option>
                <option value="3840x2160">3840x2160 (4K UHD)</option>
                <option value="1366x768">1366x768 (HD)</option>
                <option value="1080x1920">1080x1920 (Vertical / Totem)</option>
              </select>
            </div>

            {/* Orientation */}
            <div>
              <label htmlFor="orientation-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Orientação
              </label>
              <select
                id="orientation-select"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                className="w-full px-3 py-2 bg-[#090b11] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="landscape">Horizontal (Paisagem)</option>
                <option value="portrait">Vertical (Retrato / Totem)</option>
              </select>
            </div>
          </div>

          {/* Telemetry Notice (Honest Architecture Note) */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-sky-400 font-medium mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>Transparência de Arquitetura & Telemetria</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Este registro é mantido exclusivamente no armazenamento local deste navegador
              (<code>vitrion_admin_screens_v1</code>). A sincronização remota bidirecional com TVs físicas
              será habilitada em fases futuras.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-sky-600/50 text-white text-xs font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Tela'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
