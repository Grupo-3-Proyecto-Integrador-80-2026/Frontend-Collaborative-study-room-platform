import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Copy, FileText, SearchX, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roomsApi, type Room as RoomData } from '../services/api';
import { useCopyRoomId } from '../hooks/useCopyRoomId';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { ErrorBanner, LoadingBanner } from '../components/ui/StatusBanner';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

const backLink =
  'min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-indigo-700 rounded-xl transition-colors';

// Vista base de la sala (US-06 E1). El chat y el audio/video llegan en US-09 a US-14.
// No existe GET /api/rooms/:id: la sala se resuelve entre las salas propias, lo que
// permite recargar la página o abrir el enlace directamente.
export default function Room() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { profile } = useAuth();
  const navState = location.state as { room?: RoomData; justCreated?: boolean } | null;
  const initialRoom = navState?.room?.id === id ? navState.room : null;

  const [room, setRoom] = useState<RoomData | null>(initialRoom);
  const [loadState, setLoadState] = useState<LoadState>(initialRoom ? 'ready' : 'loading');
  const [reloadKey, setReloadKey] = useState(0);
  const { copiedId, toast, copy } = useCopyRoomId();
  const createdRef = useRef<HTMLDivElement>(null);
  const justCreated = Boolean(navState?.justCreated && initialRoom);

  useEffect(() => {
    if (initialRoom) return;
    let active = true;
    roomsApi
      .listMine()
      .then((res) => {
        if (!active) return;
        const found = res.rooms.find((r) => r.id === id) ?? null;
        setRoom(found);
        setLoadState(found ? 'ready' : 'not-found');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [id, initialRoom, reloadKey]);

  // Tras crear la sala, el foco va a la confirmación para que el lector la lea.
  useEffect(() => {
    if (justCreated) createdRef.current?.focus();
  }, [justCreated]);

  const retry = () => {
    setLoadState('loading');
    setReloadKey((key) => key + 1);
  };

  if (loadState === 'loading') {
    return <LoadingBanner>Cargando la sala de estudio...</LoadingBanner>;
  }

  if (loadState === 'error') {
    return (
      <div className="w-full">
        <ErrorBanner title="No pudimos abrir la sala." onRetry={retry}>
          Revisa tu conexión e inténtalo de nuevo.
        </ErrorBanner>
        <Link to="/panel" className={backLink}>
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al panel</span>
        </Link>
      </div>
    );
  }

  if (loadState === 'not-found' || !room) {
    return (
      <section aria-labelledby="room-missing" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 text-center w-full">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <SearchX className="w-7 h-7" />
        </div>
        <h1 id="room-missing" className="text-lg font-bold text-slate-900 mb-2">
          No encontramos esta sala entre tus salas
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 [text-wrap:pretty]">
          Revisa el enlace o vuelve al panel para ver las salas que has creado.
        </p>
        <Link to="/panel" className={backLink}>
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al panel</span>
        </Link>
      </section>
    );
  }

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';

  return (
    <div className="w-full">
      <Toast message={toast} />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link to="/panel" className={`${backLink} self-start`}>
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al panel</span>
        </Link>
        <nav aria-label="Ruta de navegación" className="text-xs text-slate-600 min-w-0">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/panel" className="hover:text-indigo-700 underline-offset-2 hover:underline">
                Panel de Salas
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-mono font-semibold text-slate-700 truncate">
              {room.id}
            </li>
          </ol>
        </nav>
      </div>

      {justCreated && (
        <div
          ref={createdRef}
          tabIndex={-1}
          role="status"
          className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-sm text-emerald-800 font-medium"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>Sala «{room.name}» creada. Eres el Administrador: comparte el ID para que tus compañeros puedan unirse.</span>
        </div>
      )}

      <section aria-labelledby="room-title" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
              <span className="font-semibold text-indigo-700">Sala creada · En espera</span>
              <span aria-hidden="true">·</span>
              <span>
                Tu rol: <strong className="text-slate-900">Administrador</strong>
              </span>
            </div>
            <h1 id="room-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:pretty] break-words">
              {room.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 [text-wrap:pretty]">
              Eres el anfitrión de esta sala. Comparte el ID único con tus compañeros para que puedan unirse.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 min-w-0">
            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-600">ID único de la sala</span>
              <span className="font-mono text-sm sm:text-base font-bold text-slate-900 break-all select-all">{room.id}</span>
            </div>
            <Button
              onClick={() => void copy(room.id)}
              icon={<Copy className="w-4 h-4 shrink-0" aria-hidden="true" />}
              className="min-h-11 shrink-0"
              aria-label={`Copiar ID de la sala ${room.name}`}
            >
              {copiedId === room.id ? 'Copiado' : 'Copiar ID'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <section aria-labelledby="room-waiting" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <Clock className="w-7 h-7" />
            </div>
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">Sala creada · En espera</p>
            <h2 id="room-waiting" className="text-lg font-bold text-slate-900 mb-2 mt-2 [text-wrap:pretty]">
              Esperando a tus compañeros en la sala
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed [text-wrap:pretty] break-words">
              Copia el ID <span className="font-mono font-semibold text-slate-700 break-all">{room.id}</span> y compártelo para que puedan entrar a estudiar contigo.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Button onClick={() => void copy(room.id)} icon={<Copy className="w-4 h-4" aria-hidden="true" />}>
                Copiar ID de la sala
              </Button>
              <Link to="/panel" className="min-h-12 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Volver al panel</span>
              </Link>
            </div>
          </section>

          <section aria-labelledby="room-base" className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2.5 mb-2">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
              <h2 id="room-base" className="text-base font-bold text-slate-900">
                Espacio base de la sala
              </h2>
            </div>
            <p className="text-sm text-slate-600 [text-wrap:pretty]">
              Aquí se habilitarán el chat en tiempo real y los controles de audio y video para trabajar con tu equipo.
            </p>
          </section>
        </div>

        <aside aria-labelledby="room-people" className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <h2 id="room-people" className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <span>En esta sala</span>
            </h2>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-white shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                    {profile?.firstName?.[0] ?? 'E'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{fullName} (tú)</p>
                  <p className="text-xs text-slate-600 truncate">@{profile?.username} · Administrador</p>
                </div>
              </div>
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
