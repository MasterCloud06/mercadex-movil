import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useDatos } from '@/lib/useDatos';
import { colores, espacio, fecha, radio } from '@/lib/tema';

type Comunicado = { id: string; titulo: string; texto: string; fecha: string; autor: string };

/** Comunicados vigentes de la directiva, arriba en Inicio. */
export function Comunicados({ senal }: { senal: number }) {
  // Un servidor anterior no tiene esta ruta: entonces simplemente no se muestra nada.
  const { datos, recargar } = useDatos(() => api.get<Comunicado[]>('/api/app/comunicados').catch(() => [] as Comunicado[]));
  const [abierto, setAbierto] = useState<string | null>(null);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senal]);

  if (!datos?.length) return null;

  return (
    <View style={{ marginBottom: espacio.l }}>
      <Text style={e.titulo}>Comunicados de la directiva</Text>
      {datos.map((c) => {
        const visible = abierto === c.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => setAbierto(visible ? null : c.id)}
            accessibilityRole="button"
            accessibilityHint={visible ? 'Mostrar menos' : 'Leer completo'}
            style={e.tarjeta}>
            <View style={e.cabecera}>
              <Ionicons name="megaphone-outline" size={18} color={colores.azulMedio} />
              <Text style={e.asunto}>{c.titulo}</Text>
              <Ionicons name={visible ? 'chevron-up' : 'chevron-down'} size={18} color={colores.textoTenue} />
            </View>
            <Text style={e.texto} numberOfLines={visible ? undefined : 3}>
              {c.texto}
            </Text>
            <Text style={e.pie}>{fecha(c.fecha)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const e = StyleSheet.create({
  titulo: { fontSize: 15, fontWeight: '700', color: colores.tinta, marginBottom: espacio.s },
  tarjeta: {
    backgroundColor: colores.ambarFondo,
    borderColor: '#F1DC9A',
    borderWidth: 1,
    borderRadius: radio.m,
    padding: espacio.m,
    marginBottom: espacio.s,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  asunto: { flex: 1, fontSize: 15, fontWeight: '700', color: colores.tinta },
  texto: { fontSize: 14, lineHeight: 20, color: colores.texto },
  pie: { fontSize: 12, color: colores.textoSuave, marginTop: 6 },
});
