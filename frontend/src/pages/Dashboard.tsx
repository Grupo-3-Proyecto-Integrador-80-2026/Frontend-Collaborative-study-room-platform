import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Compass, Copy, Plus, RefreshCw, Sparkles, User as UserIcon, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roomsApi, type Room } from '../services/api';
import { useCopyRoomId } from '../hooks/useCopyRoomId';
import { formatRoomDate } from '../utils/formatDate';
import { RoomNameModal } from '../components/RoomNameModal';
import { RoomActions } from '../components/RoomActions';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { ErrorBanner, LoadingBanner } from '../components/ui/StatusBanner';

type LoadState = 'loading' | 'ready' | 'error';

const byNewest = (a: Room, b: Room) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

const linkButton =
  'w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap';

export default function Dashboard() {
  const { profile, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [deletedByHost, setDeletedByHost] = useState<string | undefined>(location.state?.deletedByHost);
  const [notice, setNotice] = useState<string | undefined>(location.state?.roomNotice);
  const panelAction = useRef<HTMLButtonElement>(null);
  const roomsTitle = useRef<HTMLHeadingElement>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { copiedId, toast, copy } = useCopyRoomId();

  useEffect(() => {
    if (location.state?.deletedByHost || location.state?.roomNotice) {
      navigate('/panel', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    let active = true;
    roomsApi
      .listMine()
      .then((res) => {
        if (!active) return;
        setRooms([...res.rooms].sort(byNewest));
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setLoadState('loading');
    setReloadKey((key) => key + 1);
  };

  // US-06 E1: al crear, se entra a la sala como anfitrión.
  const handleCreated = (room: Room) => {
    setShowCreateModal(false);
    setRooms((prev) => [room, ...prev]);
    navigate(`/salas/${room.id}`, { state: { justCreated: true } });
  };

  const firstName = profile?.firstName || 'Estudiante';

  return (
    <div className="w-full">
      <Toast message={toast} />
      {notice && <Alert tone="success" className="mb-4" onDismiss={() => setNotice(undefined)}>{notice}</Alert>}
      {deletedByHost && <Modal isOpen role="alertdialog" initialFocusRef={panelAction}
        onClose={() => { setDeletedByHost(undefined); roomsTitle.current?.focus(); }}
        titleId="deleted-title" title={`El anfitrión eliminó la sala «${deletedByHost}»`}
        descriptionId="deleted-description" description="Ya no puedes enviar mensajes aquí."
        closeLabel="Cerrar aviso">
        <Button ref={panelAction} onClick={() => { setDeletedByHost(undefined); roomsTitle.current?.focus(); }}>Ir al Panel</Button>
      </Modal>}

      {loadState === 'loading' && <LoadingBanner>Cargando tus salas de estudio...</LoadingBanner>}
      {loadState === 'error' && (
        <ErrorBanner title="No pudimos cargar tus salas en este momento." onRetry={retry}>
          Revisa tu conexión e inténtalo de nuevo.
        </ErrorBanner>
      )}

      {/* Bienvenida */}
      <section aria-labelledby="dashboard-title" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 mb-6 sm:mb-8 shadow-sm w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 bg-indigo-50 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shrink-0" aria-hidden="true">
                {firstName[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">Panel</p>
              <h1 id="dashboard-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:pretty] break-words">
                ¡Hola, {firstName}!
              </h1>
              <p className="text-sm text-slate-600 mt-1 font-mono break-all">@{profile?.username}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" aria-hidden="true" />}>
              Crear sala
            </Button>
            <Link to="/perfil" className={`${linkButton} bg-white border border-slate-300 hover:bg-slate-50 text-slate-700`}>
              <UserIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Mi perfil</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <section aria-labelledby="rooms-title" aria-busy={loadState === 'loading'} className="lg:col-span-8 space-y-6 w-full">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="rooms-title" ref={roomsTitle} tabIndex={-1} className="text-lg sm:text-xl font-bold text-slate-900">
                Mis salas de estudio
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">Crea una sala, copia su ID único para compartir o entra directamente.</p>
            </div>
            {loadState === 'ready' && rooms.length > 0 && (
              <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums shrink-0">
                {rooms.length} {rooms.length === 1 ? 'sala' : 'salas'}
              </span>
            )}
          </div>

          {loadState === 'loading' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-hidden="true">
              {[1, 2, 3, 4].map((skeleton) => (
                <div key={skeleton} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse flex flex-col justify-between min-h-[176px]">
                  <div>
                    <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
                    <div className="h-5 bg-slate-200 rounded w-4/5 mb-3" />
                    <div className="h-9 bg-slate-100 rounded-xl w-full" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5 mt-4">
                    <div className="h-10 bg-slate-100 rounded-xl flex-1" />
                    <div className="h-10 bg-slate-200 rounded-xl flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadState === 'error' ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-6 sm:p-8 text-center w-full">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 [text-wrap:pretty]">No pudimos cargar tus salas de estudio</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed [text-wrap:pretty]">
                Hubo un problema de conexión al consultar tus salas. Presiona Reintentar para intentarlo de nuevo.
              </p>
              <Button variant="danger" onClick={retry} icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}>
                Reintentar
              </Button>
            </div>
          ) : rooms.length === 0 ? (
            /* US-06 E2: mensaje amigable si aún no hay salas */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 text-center w-full">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 [text-wrap:pretty]">Aún no tienes salas creadas</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed [text-wrap:pretty]">
                Crea tu primera sala de estudio para obtener un ID único, invitar a tus compañeros y estudiar juntos.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" aria-hidden="true" />}>
                  Crear sala
                </Button>
                <Link to="/" className={`${linkButton} bg-slate-100 hover:bg-slate-200 text-slate-700`}>
                  <Compass className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>Volver al inicio</span>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => {
                const isCopied = copiedId === room.id;
                return (
                  <li key={room.id}>
                    <article
                      aria-labelledby={`room-${room.id}`}
                      className="h-full bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm p-5 transition-all flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mb-2">
                          <span className="font-semibold text-indigo-700">{room.ownerId === firebaseUser?.uid ? 'Anfitrión' : 'Participante'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRoomDate(room.createdAt)}</span>
                        </div>
                        <h3 id={`room-${room.id}`} className="text-lg font-bold text-slate-900 [text-wrap:pretty] break-words mb-3">
                          {room.name}
                        </h3>
                        <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs text-slate-600 font-medium">ID de la sala</span>
                          <span className="font-mono text-sm font-bold text-slate-900 tracking-wide break-all select-all">{room.id}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => void copy(room.id)}
                          aria-label={`Copiar ID de la sala ${room.name}`}
                          className={`flex-1 min-h-11 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            isCopied
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-indigo-700'
                          }`}
                        >
                          {isCopied ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> : <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />}
                          <span>{isCopied ? 'Copiado' : 'Copiar ID'}</span>
                        </button>
                        <Link
                          to={`/salas/${room.id}`}
                          aria-label={`Entrar a la sala ${room.name}`}
                          className="flex-1 min-h-11 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                        >
                          <span>Entrar a la sala</span>
                          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </Link>
                      </div>
                      {room.ownerId === firebaseUser?.uid && <RoomActions room={room}
                        onRenamed={(name) => {
                          setRooms((prev) => prev.map((item) => item.id === room.id ? { ...item, name } : item));
                          setNotice(`Nombre actualizado: «${name}».`);
                        }}
                        onDeleted={() => {
                          setRooms((prev) => prev.filter((item) => item.id !== room.id));
                          setNotice(`Sala «${room.name}» eliminada.`);
                          roomsTitle.current?.focus();
                        }} />}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside aria-label="Ayuda" className="lg:col-span-4 space-y-6 w-full">
          <div className="p-4 sm:p-5 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-sm text-indigo-900 w-full">
            <h2 className="flex items-center gap-2 font-bold mb-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
              <span>Cómo invitar a tu equipo</span>
            </h2>
            <p className="text-sm text-indigo-900 leading-relaxed [text-wrap:pretty]">
              Al crear una sala se genera un ID único. Usa el botón <strong>Copiar ID</strong> y envíalo a tus compañeros para que puedan entrar contigo.
            </p>
          </div>
        </aside>
      </div>

      <RoomNameModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
    </div>
  );
}
