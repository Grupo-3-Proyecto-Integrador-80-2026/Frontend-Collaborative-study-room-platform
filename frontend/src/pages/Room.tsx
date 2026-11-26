import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, SearchX, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, roomsApi } from '../services/api';
import { isRoomId, missingRoomHelp, roomIdHelp } from '../utils/roomInvitation';
import { watchRoom } from '../services/roomEvents';
import { RoomActions } from '../components/RoomActions';
import { RoomChat } from '../components/RoomChat';
import { useRoomChat } from '../hooks/useRoomChat';
import { Alert } from '../components/ui/Alert';
import { useCopyRoomId } from '../hooks/useCopyRoomId';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { ErrorBanner, LoadingBanner } from '../components/ui/StatusBanner';

type LoadState = 'loading' | 'connecting' | 'ready' | 'not-found' | 'forbidden' | 'error' | 'realtime-error';

const backLink =
  'min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-indigo-700 rounded-xl transition-colors';

export default function Room() {
  const { id = '' } = useParams();
  return <RoomView key={id} id={id} />;
}

function RoomView({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, firebaseUser } = useAuth();
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
  const uid = firebaseUser?.uid ?? '';
  const { received, setSender, ...chat } = useRoomChat(id, uid, fullName);
  const onMessage = useEffectEvent(received);
  const [name, setName] = useState('Sala de estudio');
  const [ownerId, setOwnerId] = useState('');
  const isHost = ownerId === firebaseUser?.uid;
  const [members, setMembers] = useState<string[]>([]);
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'people'>('chat');
  const [liveError, setLiveError] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadState, setLoadState] = useState<LoadState>(isRoomId(id) ? 'loading' : 'not-found');
  const [reloadKey, setReloadKey] = useState(0);
  const { copiedId, toast, copy } = useCopyRoomId();
  const createdRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const deletingHere = useRef(false);
  const justCreated = Boolean(isHost && location.state?.justCreated && !notice);
  const room = { id, name };
  const leaveDeleted = (host: boolean) => navigate('/panel', { replace: true,
    state: host ? { roomNotice: `Sala «${name}» eliminada.` } : { deletedByHost: name } });
  const onDeletedEvent = useEffectEvent(leaveDeleted);

  useEffect(() => {
    if (!firebaseUser || !isRoomId(id)) return;
    const controller = new AbortController();
    let stop: (() => void) | undefined;
    roomsApi
      .getById(id, controller.signal)
      .then(({ room }) => {
        if (controller.signal.aborted) return;
        // Revalidar también al recargar o abrir desde el historial; el enlace no acredita el rol.
        const own = room.ownerId === firebaseUser.uid;
        setOwnerId(room.ownerId);
        setName(room.name);
        setLoadState(own ? 'ready' : 'connecting');
        let admitted = own;
        stop = watchRoom(id, firebaseUser, {
          joined: (send) => { admitted = true; setSender(() => send); setLiveError(false); setLoadState('ready'); },
          messageReceived: onMessage,
          membersChanged: setMembers,
          renamed: setName,
          // El evento bloquea la sala antes de que la API termine de borrar los mensajes.
          // Quien inició el DELETE espera su 204; los demás salen de inmediato.
          deleted: () => { if (!deletingHere.current) onDeletedEvent(own); },
          missing: () => setLoadState('not-found'),
          unavailable: () => {
            setSender(null);
            setLiveError(true);
            if (!admitted) setLoadState('realtime-error');
          },
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadState(err instanceof ApiError && err.code === 'ROOM_NOT_FOUND' ? 'not-found'
          : err instanceof ApiError && err.statusCode === 403 ? 'forbidden' : 'error');
      });
    return () => {
      controller.abort();
      stop?.();
    };
  }, [id, firebaseUser, reloadKey, setSender]);

  // Tras crear la sala, el foco va a la confirmación para que el lector la lea.
  useEffect(() => {
    if (loadState !== 'ready') return;
    (createdRef.current ?? titleRef.current)?.focus();
  }, [loadState]); // El foco solo cambia al entrar, no al renombrar la sala.

  const retry = () => {
    setLoadState('loading');
    setReloadKey((key) => key + 1);
  };

  if (loadState === 'loading' || loadState === 'connecting') {
    return <LoadingBanner>{loadState === 'connecting' ? 'Conectando con la sala…' : 'Cargando la sala de estudio...'}</LoadingBanner>;
  }

  if (loadState === 'error' || loadState === 'realtime-error') {
    return (
      <div className="w-full">
        <ErrorBanner title={loadState === 'realtime-error' ? 'Encontramos la sala, pero no pudimos conectar en tiempo real.' : 'No pudimos consultar la sala en la API.'} onRetry={retry}>
          Revisa tu conexión e inténtalo de nuevo.
        </ErrorBanner>
        <Link to="/panel" className={backLink}>
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al panel</span>
        </Link>
      </div>
    );
  }

  if (loadState === 'not-found' || loadState === 'forbidden') {
    return (
      <section aria-labelledby="room-missing" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 text-center w-full">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <SearchX className="w-7 h-7" />
        </div>
        <h1 id="room-missing" className="text-lg font-bold text-slate-900 mb-2">
          {loadState === 'forbidden' ? 'Tu cuenta no tiene acceso a esta sala' : 'No encontramos esta sala'}
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 [text-wrap:pretty]">
          {loadState === 'forbidden' ? 'Vuelve al panel para continuar.' : isRoomId(id) ? missingRoomHelp : roomIdHelp}
        </p>
        <Link to="/panel" className={backLink}>
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al panel</span>
        </Link>
      </section>
    );
  }

  return (
    <div className="w-full">
      <Toast message={toast} />
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}
      {liveError && <ErrorBanner title="Se perdió la conexión con la sala." onRetry={retry}>
        Conservamos tu borrador. Podrás enviar mensajes al reconectar.
      </ErrorBanner>}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link to="/panel" className={`${backLink} self-start`}>
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Salir de la sala</span>
        </Link>
        <nav aria-label="Ruta de navegación" className="text-xs text-slate-600 min-w-0">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/panel" className="hover:text-indigo-700 underline-offset-2 hover:underline">
                Panel
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
          <span>Sala «{room.name}» creada. Eres el anfitrión: comparte el ID de la sala para que tus compañeros puedan unirse.</span>
        </div>
      )}

      <section aria-labelledby="room-title" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
              <span className="font-semibold text-indigo-700">Sala de estudio</span>
              <span aria-hidden="true">·</span>
              <span>
                Tu rol: <strong className="text-slate-900">{isHost ? 'Anfitrión' : 'Participante'}</strong>
              </span>
            </div>
            <h1 ref={titleRef} tabIndex={-1} id="room-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:pretty] break-words">
              {room.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 [text-wrap:pretty]">
              {isHost ? 'Eres el anfitrión de esta sala. Comparte el ID único con tus compañeros para que puedan unirse.' : 'Has entrado como participante.'}
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
        {isHost && <div className="mt-4"><RoomActions room={room} inRoom
          onDeletingChange={(pending) => { deletingHere.current = pending; }}
          onRenamed={(value) => { setName(value); setNotice(`Nombre actualizado: «${value}».`); }}
          onDeleted={() => leaveDeleted(true)} /></div>}
      </section>

      <div role="group" aria-label="Vista de la sala" className="flex gap-2 mb-3 lg:hidden">
        <Button variant={mobilePanel === 'chat' ? 'primary' : 'outline'} aria-controls="room-chat"
          aria-pressed={mobilePanel === 'chat'} onClick={() => setMobilePanel('chat')}>Chat</Button>
        <Button variant={mobilePanel === 'people' ? 'primary' : 'outline'} aria-controls="room-participants"
          aria-pressed={mobilePanel === 'people'} onClick={() => setMobilePanel('people')}>Participantes</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <RoomChat uid={uid} visibleOnMobile={mobilePanel === 'chat'} {...chat} />

        <aside id="room-participants" aria-labelledby="room-people" className={`${mobilePanel === 'people' ? 'block' : 'hidden lg:block'} lg:col-span-4 space-y-6`}>
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
                  <p className="text-sm font-semibold text-slate-900 break-words">{fullName} (tú)</p>
                  <p className="text-xs text-slate-600 break-words">@{profile?.username} · {isHost ? 'Anfitrión' : 'Participante'}</p>
                </div>
              </div>
              {isHost && <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />}
            </div>
            <div aria-live="polite" aria-relevant="all">
              {!liveError && members.length > 0 && <>
                <p className="text-xs text-slate-600 mt-3">{members.length} {members.length === 1 ? 'persona conectada' : 'personas conectadas'}</p>
                <ul className="space-y-2 mt-2">
                  {members.filter(uid => uid !== firebaseUser?.uid).map(uid => (
                    <li key={uid} className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 break-all">
                      <strong>{uid === ownerId ? 'Anfitrión' : 'Participante'}</strong> · {uid}
                    </li>
                  ))}
                </ul>
              </>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
