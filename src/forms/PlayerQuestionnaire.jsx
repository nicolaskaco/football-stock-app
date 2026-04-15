import { useState } from 'react';
import { Upload, CheckCircle, ChevronDown } from 'lucide-react';
import { database } from '../utils/database.js';
import { DEPARTAMENTOS } from '../utils/constants.js';

// ── Opciones reutilizables ─────────────────────────────────────────────────

const TRANSPORTE_OPTIONS = ['Bus del Club', 'Auto', 'Moto', 'Bici', 'Caminando', 'Otro'];

const TIEMPO_OPTIONS = [
  '15 minutos o menos',
  'Entre 15 y 30 minutos',
  'Entre 30 minutos y 1 hora',
  'Más de 1 hora',
];

const NIVEL_EDUCATIVO_OPTIONS = [
  'Primaria (incompleto)',
  'Primaria (completo)',
  'Media básica (incompleto)',
  'Media básica (completo)',
  'Media superior (incompleto)',
  'Media superior (completo)',
  'Terciario (incompleto)',
  'Terciario (completo)',
];

const COMPOSICION_FAMILIAR_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', 'Más de 8'];

const COMPARTE_TIEMPO_OPTIONS = ['Padre', 'Madre', 'Hermanos', 'Primos', 'Amigos', 'Vecinos'];

const ACCESO_HOGAR_OPTIONS = [
  'Cuatro comidas diarias (desayuno, almuerzo, merienda, cena)',
  'Luz',
  'Agua',
  'Internet',
  'Gas',
  'Saneamiento',
  'Televisión por cable',
  'Calefacción',
  'Estufa',
  'Aire acondicionado',
  'Ventilador',
  'Otros',
];

// ── Helpers de UI ──────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h3 className="text-base font-semibold text-yellow-400 border-b border-gray-700 pb-2 mb-4 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:opacity-50"
    />
  );
}

function SelectInput({ value, onChange, options, placeholder = 'Seleccioná una opción', disabled }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent appearance-none disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  );
}

function YesNo({ value, onChange, disabled }) {
  return (
    <div className="flex gap-4">
      {['Sí', 'No'].map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
          <input
            type="radio"
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            disabled={disabled}
            className="accent-yellow-400"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function MultiSelect({ options, selected, onChange, disabled }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            selected.includes(opt)
              ? 'bg-yellow-400 text-black border-yellow-400'
              : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-yellow-400'
          } disabled:opacity-50`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function FileUploadField({ label, docType, playerId, uploading, setUploading, uploaded, setUploaded }) {
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading((prev) => ({ ...prev, [docType]: true }));
    try {
      const results = [];
      for (const file of Array.from(files)) {
        const path = await database.uploadDocument(playerId, file, docType);
        results.push(path);
      }
      setUploaded((prev) => ({ ...prev, [docType]: (prev[docType] || 0) + results.length }));
    } catch (err) {
      alert('Error al subir archivo: ' + err.message);
    } finally {
      setUploading((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const count = uploaded[docType] || 0;
  const isUploading = uploading[docType];

  return (
    <Field label={label}>
      <label className="flex items-center gap-3 border border-dashed border-gray-600 rounded-lg px-4 py-3 cursor-pointer hover:border-yellow-400 transition-colors bg-gray-800">
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
        {isUploading ? (
          <span className="text-sm text-gray-400">Subiendo...</span>
        ) : count > 0 ? (
          <span className="flex items-center gap-2 text-sm text-yellow-400">
            <CheckCircle className="w-4 h-4" />
            {count} archivo{count !== 1 ? 's' : ''} subido{count !== 1 ? 's' : ''}
            <span className="text-gray-500">(podés agregar más)</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-gray-400">
            <Upload className="w-4 h-4" />
            Seleccioná uno o más archivos
          </span>
        )}
      </label>
    </Field>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

const EMPTY = {
  // Contacto
  email: '',
  telefono: '',

  // Documentos
  tiene_pasaporte_uy: '',
  tiene_pasaporte_ext: '',
  pais_pasaporte_ext: '',

  // Salud
  tiene_prestador_salud: '',
  prestador_salud_cual: '',
  tiene_emergencia_movil: '',
  emergencia_movil_cual: '',

  // Llegada al club
  anio_llegada_club: '',
  liga_proviene: '',
  club_proviene: '',
  mediante_quien_llego: '',
  quien_capto: '',

  // Representante
  tiene_agente: '',
  agente_info: '',

  // Transporte entrenamiento
  transporte_entrenamiento: '',
  transporte_entrenamiento_otro: '',
  tiempo_entrenamiento: '',

  // Educación
  centro_educativo_tipo: '',
  centro_educativo_nombre: '',
  transporte_educativo: '',
  transporte_educativo_otro: '',
  tiempo_educativo: '',
  nivel_educativo: '',
  repitio_anio: '',
  repitio_nivel: '',

  // Entorno
  antecedentes_adiciones: '',
  composicion_familiar: '',
  convivencia_descripcion: '',
  comparte_tiempo_con: [], // multiselect → array

  // Padre
  padre_nombre: '',
  padre_celular: '',
  padre_ocupacion: '',
  padre_nivel_educativo: '',
  padre_edad: '',

  // Madre
  madre_nombre: '',
  madre_celular: '',
  madre_ocupacion: '',
  madre_nivel_educativo: '',
  madre_edad: '',

  // Vivienda
  departamento: '',
  barrio: '',
  direccion: '',
  tenencia_vivienda: '',
  condiciones_habitabilidad: '',
  material_techo: '',
  material_paredes: '',
  material_piso: '',
  num_habitaciones: '',
  acceso_hogar: [], // multiselect → array

  // Extra
  comentario_extra: '',
};

export default function PlayerQuestionnaire({ player, onComplete }) {
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState({});
  const [uploaded, setUploaded] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      // Serialize multiselect arrays as semicolon-separated strings for DB storage
      const answers = {
        ...form,
        comparte_tiempo_con: form.comparte_tiempo_con.join(';'),
        acceso_hogar: form.acceso_hogar.join(';'),
        anio_llegada_club: form.anio_llegada_club ? Number(form.anio_llegada_club) : null,
        padre_edad: form.padre_edad ? Number(form.padre_edad) : null,
        madre_edad: form.madre_edad ? Number(form.madre_edad) : null,
        // Booleans
        tiene_pasaporte_uy: form.tiene_pasaporte_uy === 'Sí' ? true : form.tiene_pasaporte_uy === 'No' ? false : null,
        tiene_pasaporte_ext: form.tiene_pasaporte_ext === 'Sí' ? true : form.tiene_pasaporte_ext === 'No' ? false : null,
        tiene_prestador_salud: form.tiene_prestador_salud === 'Sí' ? true : form.tiene_prestador_salud === 'No' ? false : null,
        tiene_emergencia_movil: form.tiene_emergencia_movil === 'Sí' ? true : form.tiene_emergencia_movil === 'No' ? false : null,
        tiene_agente: form.tiene_agente === 'Sí' ? true : form.tiene_agente === 'No' ? false : null,
        antecedentes_adiciones: form.antecedentes_adiciones === 'Sí' ? true : form.antecedentes_adiciones === 'No' ? false : null,
        repitio_anio: form.repitio_anio === 'Sí' ? true : form.repitio_anio === 'No' ? false : null,
      };

      await database.submitPlayerQuestionnaire(player.id, answers);
      onComplete();
    } catch (err) {
      if (err.message?.includes('unique') || err.code === '23505') {
        setSubmitError('Ya completaste el formulario anteriormente. ¡Gracias!');
      } else {
        setSubmitError('Error al enviar el formulario: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fileProps = { playerId: player.id, uploading, setUploading, uploaded, setUploaded };

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-yellow-400">Formulario del jugador</h1>
          <p className="text-gray-400 mt-1">Bienvenido, <span className="font-medium text-white">{player.name}</span></p>
          <p className="text-sm text-gray-600 mt-1">
            Completá el formulario una sola vez. Una vez enviado, no podrá modificarse.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-700 p-6 space-y-2">

          {/* ── Contacto ──────────────────────────────────────────── */}
          <SectionTitle>Contacto</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Dirección de correo electrónico">
              <TextInput type="email" value={form.email} onChange={set('email')} placeholder="ejemplo@correo.com" disabled={submitting} />
            </Field>
            <Field label="Número de celular">
              <TextInput value={form.telefono} onChange={set('telefono')} placeholder="09x xxx xxx" disabled={submitting} />
            </Field>
          </div>

          {/* ── Documentos / identidad ────────────────────────────── */}
          <SectionTitle>Documentos</SectionTitle>

          <FileUploadField label="Foto de la cédula" docType="gov_id" {...fileProps} />

          <Field label="¿Tenés pasaporte uruguayo?">
            <YesNo value={form.tiene_pasaporte_uy} onChange={set('tiene_pasaporte_uy')} disabled={submitting} />
          </Field>
          {form.tiene_pasaporte_uy === 'Sí' && (
            <FileUploadField label="Adjuntar pasaporte uruguayo" docType="passport_uy" {...fileProps} />
          )}

          <Field label="¿Tenés pasaporte extranjero?">
            <YesNo value={form.tiene_pasaporte_ext} onChange={set('tiene_pasaporte_ext')} disabled={submitting} />
          </Field>
          {form.tiene_pasaporte_ext === 'Sí' && (
            <div className="space-y-3">
              <Field label="País del pasaporte extranjero">
                <TextInput value={form.pais_pasaporte_ext} onChange={set('pais_pasaporte_ext')} placeholder="Ej: Argentina" disabled={submitting} />
              </Field>
              <FileUploadField label="Adjuntar pasaporte extranjero" docType="passport_ext" {...fileProps} />
            </div>
          )}

          <FileUploadField label="Foto de presentación (tipo foto carnet)" docType="foto_carnet" {...fileProps} />

          {/* ── Salud ─────────────────────────────────────────────── */}
          <SectionTitle>Salud</SectionTitle>

          <Field label="¿Tenés prestador de salud?">
            <YesNo value={form.tiene_prestador_salud} onChange={set('tiene_prestador_salud')} disabled={submitting} />
          </Field>
          {form.tiene_prestador_salud === 'Sí' && (
            <Field label="¿Cuál es tu prestador de salud?">
              <TextInput value={form.prestador_salud_cual} onChange={set('prestador_salud_cual')} placeholder="Ej: ASSE, Médica Uruguaya..." disabled={submitting} />
            </Field>
          )}

          <Field label="¿Tenés emergencia móvil?">
            <YesNo value={form.tiene_emergencia_movil} onChange={set('tiene_emergencia_movil')} disabled={submitting} />
          </Field>
          {form.tiene_emergencia_movil === 'Sí' && (
            <Field label="¿Cuál es tu emergencia móvil?">
              <TextInput value={form.emergencia_movil_cual} onChange={set('emergencia_movil_cual')} placeholder="Ej: Emergencia Médica, UCM..." disabled={submitting} />
            </Field>
          )}

          {/* ── Llegada al club ───────────────────────────────────── */}
          <SectionTitle>Llegada al club</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="¿En qué año llegaste al club?">
              <TextInput type="number" value={form.anio_llegada_club} onChange={set('anio_llegada_club')} placeholder="Ej: 2022" disabled={submitting} />
            </Field>
            <Field label="¿De qué liga provenís?">
              <TextInput value={form.liga_proviene} onChange={set('liga_proviene')} placeholder="Ej: OFI, AUF..." disabled={submitting} />
            </Field>
            <Field label="¿De qué club provenís?">
              <TextInput value={form.club_proviene} onChange={set('club_proviene')} placeholder="Nombre del club anterior" disabled={submitting} />
            </Field>
          </div>

          <Field label="¿Mediante quién llegaste al club?">
            <TextInput value={form.mediante_quien_llego} onChange={set('mediante_quien_llego')} placeholder="Nombre y apellido" disabled={submitting} />
          </Field>
          <Field label="¿Quién te captó/acercó y trajo al club?">
            <TextInput value={form.quien_capto} onChange={set('quien_capto')} placeholder="Nombre y apellido" disabled={submitting} />
          </Field>

          <Field label="¿Tenés agente o representante?">
            <YesNo value={form.tiene_agente} onChange={set('tiene_agente')} disabled={submitting} />
          </Field>
          {form.tiene_agente === 'Sí' && (
            <Field label="Nombre completo y agencia del representante">
              <TextInput value={form.agente_info} onChange={set('agente_info')} placeholder="Nombre completo y agencia" disabled={submitting} />
            </Field>
          )}

          {/* ── Transporte al entrenamiento ───────────────────────── */}
          <SectionTitle>Transporte al entrenamiento</SectionTitle>

          <Field label="¿Qué transporte usás para ir a los entrenamientos/partidos?">
            <SelectInput
              value={form.transporte_entrenamiento}
              onChange={set('transporte_entrenamiento')}
              options={TRANSPORTE_OPTIONS}
              disabled={submitting}
            />
          </Field>
          {form.transporte_entrenamiento === 'Otro' && (
            <Field label="Especificá el medio de transporte">
              <TextInput value={form.transporte_entrenamiento_otro} onChange={set('transporte_entrenamiento_otro')} placeholder="Describí cómo llegás" disabled={submitting} />
            </Field>
          )}

          <Field label="¿Cuánto tiempo tardás de tu casa al centro de entrenamiento?">
            <SelectInput
              value={form.tiempo_entrenamiento}
              onChange={set('tiempo_entrenamiento')}
              options={TIEMPO_OPTIONS}
              disabled={submitting}
            />
          </Field>

          {/* ── Centro educativo ──────────────────────────────────── */}
          <SectionTitle>Centro educativo</SectionTitle>

          <Field label="¿Asistís a un centro educativo público o privado?">
            <SelectInput
              value={form.centro_educativo_tipo}
              onChange={set('centro_educativo_tipo')}
              options={['Público', 'Privado', 'No asiste']}
              disabled={submitting}
            />
          </Field>

          {form.centro_educativo_tipo && form.centro_educativo_tipo !== 'No asiste' && (
            <>
              <Field label="Nombre o número del centro educativo al que asistís">
                <TextInput value={form.centro_educativo_nombre} onChange={set('centro_educativo_nombre')} placeholder="Ej: Liceo N° 5, UTU Montevideo..." disabled={submitting} />
              </Field>

              <Field label="¿Qué transporte usás para ir al centro educativo?">
                <SelectInput
                  value={form.transporte_educativo}
                  onChange={set('transporte_educativo')}
                  options={TRANSPORTE_OPTIONS}
                  disabled={submitting}
                />
              </Field>
              {form.transporte_educativo === 'Otro' && (
                <Field label="Especificá el medio de transporte al centro educativo">
                  <TextInput value={form.transporte_educativo_otro} onChange={set('transporte_educativo_otro')} placeholder="Describí cómo llegás" disabled={submitting} />
                </Field>
              )}

              <Field label="¿Cuánto tiempo tardás de tu casa al centro educativo?">
                <SelectInput
                  value={form.tiempo_educativo}
                  onChange={set('tiempo_educativo')}
                  options={TIEMPO_OPTIONS}
                  disabled={submitting}
                />
              </Field>
            </>
          )}

          <Field label="Nivel educativo: indicá el último año aprobado">
            <TextInput value={form.nivel_educativo} onChange={set('nivel_educativo')} placeholder="Ej: 3er año de liceo, 1er año de UTU..." disabled={submitting} />
          </Field>

          <Field label="¿Repetiste algún año?">
            <YesNo value={form.repitio_anio} onChange={set('repitio_anio')} disabled={submitting} />
          </Field>
          {form.repitio_anio === 'Sí' && (
            <Field label="Indicá qué nivel repetiste">
              <TextInput value={form.repitio_nivel} onChange={set('repitio_nivel')} placeholder="Ej: 1er año de liceo" disabled={submitting} />
            </Field>
          )}

          {/* ── Entorno familiar y social ─────────────────────────── */}
          <SectionTitle>Entorno familiar y social</SectionTitle>

          <Field label="En tu entorno cercano, ¿existen antecedentes de adicciones al juego, alcohol, drogas, etc.?">
            <YesNo value={form.antecedentes_adiciones} onChange={set('antecedentes_adiciones')} disabled={submitting} />
          </Field>

          <Field label="Composición familiar: número de personas con las que convivís">
            <SelectInput
              value={form.composicion_familiar}
              onChange={set('composicion_familiar')}
              options={COMPOSICION_FAMILIAR_OPTIONS}
              disabled={submitting}
            />
          </Field>

          <Field label="Describí con quién convivís en la misma casa">
            <textarea
              value={form.convivencia_descripcion}
              onChange={(e) => set('convivencia_descripcion')(e.target.value)}
              placeholder="Ej: Vivo con mi madre, mi abuela y dos hermanos menores."
              rows={3}
              disabled={submitting}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none disabled:opacity-50"
            />
          </Field>

          <Field label="Cuando estás en tu casa, compartís tiempo con:">
            <MultiSelect
              options={COMPARTE_TIEMPO_OPTIONS}
              selected={form.comparte_tiempo_con}
              onChange={set('comparte_tiempo_con')}
              disabled={submitting}
            />
          </Field>

          {/* ── Padre / tutor ─────────────────────────────────────── */}
          <SectionTitle>Padre / tutor / figura paterna</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre">
              <TextInput value={form.padre_nombre} onChange={set('padre_nombre')} placeholder="Nombre y apellido" disabled={submitting} />
            </Field>
            <Field label="Celular">
              <TextInput value={form.padre_celular} onChange={set('padre_celular')} placeholder="09x xxx xxx" disabled={submitting} />
            </Field>
            <Field label="Ocupación">
              <TextInput value={form.padre_ocupacion} onChange={set('padre_ocupacion')} placeholder="Ocupación o trabajo" disabled={submitting} />
            </Field>
            <Field label="Edad">
              <TextInput type="number" value={form.padre_edad} onChange={set('padre_edad')} placeholder="Edad" disabled={submitting} />
            </Field>
          </div>
          <Field label="Nivel educativo del padre">
            <SelectInput
              value={form.padre_nivel_educativo}
              onChange={set('padre_nivel_educativo')}
              options={NIVEL_EDUCATIVO_OPTIONS}
              disabled={submitting}
            />
          </Field>

          {/* ── Madre / tutora ────────────────────────────────────── */}
          <SectionTitle>Madre / tutora / figura materna</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre">
              <TextInput value={form.madre_nombre} onChange={set('madre_nombre')} placeholder="Nombre y apellido" disabled={submitting} />
            </Field>
            <Field label="Celular">
              <TextInput value={form.madre_celular} onChange={set('madre_celular')} placeholder="09x xxx xxx" disabled={submitting} />
            </Field>
            <Field label="Ocupación">
              <TextInput value={form.madre_ocupacion} onChange={set('madre_ocupacion')} placeholder="Ocupación o trabajo" disabled={submitting} />
            </Field>
            <Field label="Edad">
              <TextInput type="number" value={form.madre_edad} onChange={set('madre_edad')} placeholder="Edad" disabled={submitting} />
            </Field>
          </div>
          <Field label="Nivel educativo de la madre">
            <SelectInput
              value={form.madre_nivel_educativo}
              onChange={set('madre_nivel_educativo')}
              options={NIVEL_EDUCATIVO_OPTIONS}
              disabled={submitting}
            />
          </Field>

          {/* ── Vivienda ──────────────────────────────────────────── */}
          <SectionTitle>Vivienda</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Departamento en el que residís">
              <SelectInput
                value={form.departamento}
                onChange={set('departamento')}
                options={DEPARTAMENTOS}
                disabled={submitting}
              />
            </Field>
            <Field label="Barrio">
              <TextInput value={form.barrio} onChange={set('barrio')} placeholder="Barrio" disabled={submitting} />
            </Field>
          </div>

          <Field label="Dirección">
            <TextInput value={form.direccion} onChange={set('direccion')} placeholder="Calle y número" disabled={submitting} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tenencia de vivienda">
              <SelectInput
                value={form.tenencia_vivienda}
                onChange={set('tenencia_vivienda')}
                options={['Propietario', 'Inquilino', 'Ocupante']}
                disabled={submitting}
              />
            </Field>
            <Field label="¿Cómo considerás las condiciones de habitabilidad?">
              <SelectInput
                value={form.condiciones_habitabilidad}
                onChange={set('condiciones_habitabilidad')}
                options={['Adecuadas', 'Inadecuadas']}
                disabled={submitting}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Material predominante en el techo">
              <SelectInput
                value={form.material_techo}
                onChange={set('material_techo')}
                options={[
                  'Material pesado (hormigón)',
                  'Material liviano (chapa, tejas sobre tirantes, etc.)',
                ]}
                disabled={submitting}
              />
            </Field>
            <Field label="Material predominante en las paredes">
              <SelectInput
                value={form.material_paredes}
                onChange={set('material_paredes')}
                options={[
                  'Material pesado (hormigón)',
                  'Material liviano (chapa, tejas sobre tirantes, etc.)',
                ]}
                disabled={submitting}
              />
            </Field>
            <Field label="Material predominante en el piso">
              <SelectInput
                value={form.material_piso}
                onChange={set('material_piso')}
                options={[
                  'Cerámica, parquet, moquette, etc.',
                  'Alisado de hormigón',
                ]}
                disabled={submitting}
              />
            </Field>
          </div>

          <Field label="Número de habitaciones (dormitorios)">
            <SelectInput
              value={form.num_habitaciones}
              onChange={set('num_habitaciones')}
              options={['1', '2', '3', '4', 'Más de 5']}
              disabled={submitting}
            />
          </Field>

          <Field label="Indicá a lo que accedés en tu hogar (podés elegir varios)">
            <MultiSelect
              options={ACCESO_HOGAR_OPTIONS}
              selected={form.acceso_hogar}
              onChange={set('acceso_hogar')}
              disabled={submitting}
            />
          </Field>

          {/* ── Comentarios ───────────────────────────────────────── */}
          <SectionTitle>Comentarios</SectionTitle>

          <Field label="¿Deseás agregar algún comentario extra?">
            <textarea
              value={form.comentario_extra}
              onChange={(e) => set('comentario_extra')(e.target.value)}
              placeholder="Cualquier información adicional que quieras compartir con el club."
              rows={4}
              disabled={submitting}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none disabled:opacity-50"
            />
          </Field>

          {/* ── Error + submit ────────────────────────────────────── */}
          {submitError && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
              {submitError}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/40 disabled:text-black/40 text-black font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {submitting ? 'Enviando...' : 'Enviar formulario'}
            </button>
            <p className="text-center text-xs text-gray-600 mt-3">
              Una vez enviado, no podrá modificarse. Revisá tus respuestas antes de enviar.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
