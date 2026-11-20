import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Radio, Search, Share2, ShieldCheck, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImage from '../assets/images/hero-study-room.jpg';
import groupImage from '../assets/images/study-group-session.jpg';

type Mode = 'all' | 'silent' | 'discussion' | 'pomodoro';

const SAMPLE_ROOMS = [
  {
    id: 'r1',
    title: 'Cálculo Multivariable · Preparación Parcial 2',
    faculty: 'Ingeniería y Ciencias',
    participants: 4,
    maxParticipants: 8,
    mode: 'silent' as Mode,
    modeLabel: 'Sala Silenciosa',
    topic: 'Integrales dobles e iteradas',
  },
  {
    id: 'r2',
    title: 'Estructuras de Datos y Algoritmos',
    faculty: 'Ingeniería de Sistemas',
    participants: 7,
    maxParticipants: 10,
    mode: 'discussion' as Mode,
    modeLabel: 'Debate y Pizarra',
    topic: 'Árboles AVL y Grafos BFS',
  },
  {
    id: 'r3',
    title: 'Física II · Dinámica y Electromagnetismo',
    faculty: 'Ciencias Naturales',
    participants: 5,
    maxParticipants: 6,
    mode: 'pomodoro' as Mode,
    modeLabel: 'Pomodoro 25/5 min',
    topic: 'Ley de Gauss y flujo de campo',
  },
  {
    id: 'r4',
    title: 'Bioquímica Celular · Repaso de Enzimas',
    faculty: 'Salud y Medicina',
    participants: 3,
    maxParticipants: 6,
    mode: 'discussion' as Mode,
    modeLabel: 'Discusión Abierta',
    topic: 'Cinética enzimática de Michaelis-Menten',
  },
];

const FILTERS: Array<{ value: Mode; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'silent', label: 'Modo Silencio' },
  { value: 'discussion', label: 'Debate Abierto' },
  { value: 'pomodoro', label: 'Pomodoro 25/5' },
];

const FEATURES = [
  {
    icon: Share2,
    tone: 'bg-indigo-50 text-indigo-600',
    title: 'Pizarra Colaborativa y Soporte TeX',
    text: 'Dibuja diagramas de cuerpo libre, esquemas de bases de datos y ecuaciones simultáneamente con tu grupo.',
  },
  {
    icon: Clock,
    tone: 'bg-emerald-50 text-emerald-700',
    title: 'Pomodoro Sincronizado Grupal',
    text: 'Rondas estructuradas de 25 minutos de concentración absoluta y 5 minutos de descanso guiado para todos en la sala.',
  },
  {
    icon: VolumeX,
    tone: 'bg-amber-50 text-amber-700',
    title: 'Modo Silencio de Biblioteca Estricta',
    text: 'Canales donde se respeta la concentración visual mutua sin interrupciones acústicas, ideal para lecturas densas.',
  },
];

const METRICS = [
  { value: '12.450+', label: 'Horas de estudio grupal', accent: false },
  { value: '94,8 %', label: 'Tasa de aprobación en materias críticas', accent: true },
  { value: '18', label: 'Facultades y programas activos', accent: false },
  { value: 'Gratis', label: '100 % abierto para estudiantes', accent: false },
];

// Inicio del prototipo aprobado. Las salas de esta página son ejemplos ilustrativos;
// «Entrar a la sala» lleva al acceso (o al panel si ya hay sesión).
export default function Home() {
  const { firebaseUser } = useAuth();
  const [filter, setFilter] = useState<Mode>('all');
  const [query, setQuery] = useState('');
  const entryPath = firebaseUser ? '/panel' : '/ingreso';

  const q = query.trim().toLowerCase();
  const rooms = SAMPLE_ROOMS.filter(
    (room) =>
      (filter === 'all' || room.mode === filter) &&
      (!q || [room.title, room.topic, room.faculty].some((text) => text.toLowerCase().includes(q)))
  );

  return (
    <>
      {/* Portada */}
      <section aria-labelledby="home-title" className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 pt-8 pb-14 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col justify-center w-full">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-3 sm:mb-4">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" aria-hidden="true" />
                <span>Comunidad Universitaria Activa</span>
                <span aria-hidden="true">·</span>
                <span>Semestre 2026</span>
              </p>

              <h1 id="home-title" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-snug sm:leading-tight lg:leading-tight [text-wrap:pretty] break-words mb-4 sm:mb-5">
                Estudia en equipo, resuelve dudas y alcanza tus metas académicas
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed [text-wrap:pretty] max-w-2xl mb-6 sm:mb-8">
                Salas de estudio colaborativas con pizarras virtuales sincrónicas, temporizadores Pomodoro compartidos y notas académicas sincronizadas entre compañeros de universidad.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                <Link
                  to={entryPath}
                  className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                >
                  <span>Unirse a una sala ahora</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </Link>
                <Link
                  to="/registro"
                  className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center px-5 py-3.5 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Crear cuenta
                </Link>
              </div>

              <ul className="mt-8 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Sin software adicional requerido</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Verificación institucional segura</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Salas 24/7 con control de ruido</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-5 relative w-full">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white w-full">
                <img
                  src={heroImage}
                  alt="Estudiantes en el salón de estudio universitario"
                  width={1200}
                  height={1200}
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-md">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                      <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" aria-hidden="true" />
                      <span className="truncate">Sala en vivo: Cálculo Multivariable</span>
                    </span>
                    <span className="text-slate-600 font-mono text-[11px] shrink-0 ml-2">4 / 8 cupos</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">Repaso de coordenadas polares y multiplicadores de Lagrange.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Salas activas */}
      <section id="salas" aria-labelledby="rooms-title" className="py-10 sm:py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Ambientes colaborativos abiertos</p>
              <h2 id="rooms-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight [text-wrap:pretty]">
                Salas de estudio activas en este momento
              </h2>
            </div>

            <div role="group" aria-label="Filtrar salas por modo" className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto [scrollbar-width:none]">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                  className={`min-h-11 px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-6">
            <label htmlFor="room-search" className="sr-only">
              Buscar salas por materia, tema o facultad
            </label>
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id="room-search"
              type="search"
              placeholder="Buscar por materia, tema o facultad (ej. Cálculo, Física, Algoritmos)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-h-12 pl-11 pr-4 py-3 text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white transition-all"
            />
          </div>

          <p role="status" className="sr-only">
            {rooms.length === 1 ? '1 sala encontrada' : `${rooms.length} salas encontradas`}
          </p>

          {rooms.length === 0 ? (
            <div className="p-6 sm:p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <h3 className="text-base font-bold text-slate-900 mb-1">No encontramos salas con ese criterio</h3>
              <p className="text-sm text-slate-600">Prueba con otra materia o elige «Todas».</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {rooms.map((room) => (
                <li key={room.id}>
                  <article
                    aria-labelledby={`sample-${room.id}`}
                    className="group h-full p-5 bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-600 mb-2.5">
                        <span className="font-medium truncate">{room.faculty}</span>
                        <span className="font-mono text-indigo-700 font-medium shrink-0">
                          {room.participants}/{room.maxParticipants} estudiantes
                        </span>
                      </div>
                      <h3 id={`sample-${room.id}`} className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors [text-wrap:pretty] mb-2">
                        {room.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-4 [text-wrap:pretty]">{room.topic}</p>
                    </div>
                    <div className="pt-3.5 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600">{room.modeLabel}</span>
                      <Link
                        to={entryPath}
                        aria-label={`Entrar a la sala ${room.title}`}
                        className="min-h-11 px-3.5 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 rounded-lg hover:bg-indigo-50/60 transition-colors"
                      >
                        <span>Entrar</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Herramientas */}
      <section id="herramientas" aria-labelledby="tools-title" className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-6 w-full">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md w-full">
                <img
                  src={groupImage}
                  alt="Sesión de estudio colaborativo con pizarra interactiva"
                  width={1200}
                  height={800}
                  loading="lazy"
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-6 w-full">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Herramientas Sincrónicas</p>
              <h2 id="tools-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-3 sm:mb-4 [text-wrap:pretty]">
                Diseñado para que ningún estudiante se quede atrás
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed [text-wrap:pretty]">
                Nuestras salas de estudio integran pizarras matemáticas con soporte para fórmulas, temporizadores Pomodoro autoritativos y control de sonido adaptativo según el nivel de concentración requerido.
              </p>
              <ul className="space-y-3.5 sm:space-y-4">
                {FEATURES.map(({ icon: Icon, tone, title, text }) => (
                  <li key={title} className="flex items-start gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 w-full shadow-sm">
                    <span className={`w-10 h-10 rounded-xl ${tone} flex items-center justify-center shrink-0`} aria-hidden="true">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 [text-wrap:pretty]">{title}</h3>
                      <p className="text-sm text-slate-600 mt-1 [text-wrap:pretty]">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cifras */}
      <section aria-label="Cifras de la comunidad" className="py-10 sm:py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            {METRICS.map((metric) => (
              <div key={metric.label} className="p-5 bg-slate-50/70 sm:bg-transparent rounded-2xl border sm:border-0 border-slate-200/80 flex flex-col-reverse">
                <dt className="text-sm text-slate-600 mt-1.5 [text-wrap:pretty]">{metric.label}</dt>
                <dd className={`text-2xl sm:text-3xl md:text-4xl font-extrabold font-mono tabular-nums ${metric.accent ? 'text-indigo-600' : 'text-slate-900'}`}>
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
