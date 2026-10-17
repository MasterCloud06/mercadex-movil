import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Comunicados } from '@/componentes/Comunicados';
import { Aviso, Boton, Cargando, Etiqueta, Tarjeta, Vacio } from '@/componentes/ui';
import { api, type Deuda, type DeudasUnidad } from '@/lib/api';
import { useDatos } from '@/lib/useDatos';
import { useSesion } from '@/lib/sesion';
import { colores, dinero, espacio, fecha, radio } from '@/lib/tema';

export default function Deudas() {
  const { sesion } = useSesion();
  const { datos, error, cargando, recargando, recargar } = useDatos(() => api.get<DeudasUnidad[]>('/api/app/deudas'));
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [senal, setSenal] = useState(0);

  const todas = useMemo(
    () => (datos ?? []).flatMap((u) => u.deudas.map((d) => ({ ...d, unidadId: u.unidadId, caseta: u.codigo }))),
    [datos],
  );

  // Totales por moneda (nunca se suman bolivianos con dólares).
  const totales = useMemo(() => {
    const t = new Map<string, { total: number; cantidad: number }>();
    for (const d of todas) {
      const actual = t.get(d.moneda) ?? { total: 0, cantidad: 0 };
      t.set(d.moneda, { total: actual.total + d.monto, cantidad: actual.cantidad + 1 });
    }
    return [...t.entries()].sort(([a]) => (a === 'BOB' ? -1 : 1));
  }, [todas]);

  const elegidas = todas.filter((d) => seleccion.includes(d.id));
  const totalElegido = elegidas.reduce((s, d) => s + d.monto, 0);

  const alternar = (d: Deuda & { unidadId: string; caseta: string }) => {
    setAviso(null);
    if (seleccion.includes(d.id)) {
      setSeleccion(seleccion.filter((x) => x !== d.id));
      return;
    }
    const primera = elegidas[0];
    if (primera && (primera.unidadId !== d.unidadId || primera.moneda !== d.moneda)) {
      setAviso(
        primera.unidadId !== d.unidadId
          ? 'Las deudas de cada caseta se pagan por separado. Empezamos una selección nueva.'
          : 'Bolivianos y dólares se pagan por separado. Empezamos una selección nueva.',
      );
      setSeleccion([d.id]);
      return;
    }
    setSeleccion([...seleccion, d.id]);
  };

  if (cargando && !datos) return <Cargando texto="Consultando tus deudas..." />;

  const sinCasetas = datos?.length === 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: espacio.l, paddingBottom: elegidas.length ? 120 : 32 }}
        refreshControl={<RefreshControl refreshing={recargando} onRefresh={() => {
              setSenal((n) => n + 1);
              void recargar();
            }} tintColor={colores.azulMedio} />}>
        <Text style={e.saludo}>Hola, {sesion?.nombres.split(' ')[0]}</Text>

        {error ? <Aviso texto={error} /> : null}

        <Comunicados senal={senal} />

        {/* Resumen: lo que debe, por moneda */}
        <View style={e.resumen}>
          <Text style={e.resumenEtiqueta}>{todas.length ? 'Tienes pendiente' : 'Estás al día'}</Text>
          {totales.length ? (
            totales.map(([moneda, t]) => (
              <Text key={moneda} style={e.resumenMonto}>
                {dinero(t.total, moneda)}
              </Text>
            ))
          ) : (
            <Text style={e.resumenMonto}>Sin deudas</Text>
          )}
          <Text style={e.resumenNota}>
            {todas.length
              ? `${todas.length} ${todas.length === 1 ? 'deuda' : 'deudas'} en ${datos?.filter((u) => u.deudas.length).length} ${datos?.filter((u) => u.deudas.length).length === 1 ? 'caseta' : 'casetas'}. Marca las que quieres pagar.`
              : 'Gracias por mantener tus pagos al día.'}
          </Text>
        </View>

        {aviso ? <Aviso texto={aviso} tono="info" /> : null}

        {sinCasetas ? (
          <Vacio
            icono="storefront-outline"
            titulo="Sin casetas asignadas"
            texto="Todavía no figuras como titular de ninguna caseta. Consulta en la caja de la asociación."
          />
        ) : null}

        {(datos ?? []).map((u) => (
          <View key={u.unidadId} style={{ marginBottom: espacio.l }}>
            <View style={e.casetaCabecera}>
              <Text style={e.casetaTitulo}>Caseta {u.codigo}</Text>
              <Text style={e.casetaBloque}>{u.bloque ? `Bloque ${u.bloque}` : ''}</Text>
            </View>

            {u.deudas.length === 0 ? (
              <Tarjeta>
                <View style={e.fila}>
                  <Ionicons name="checkmark-circle" size={22} color={colores.verde} />
                  <Text style={[e.concepto, { marginLeft: 10 }]}>Al día</Text>
                </View>
              </Tarjeta>
            ) : (
              <Tarjeta estilo={{ padding: 0, overflow: 'hidden' }}>
                {u.deudas.map((d, i) => {
                  const marcada = seleccion.includes(d.id);
                  return (
                    <Pressable
                      key={d.id}
                      disabled={d.enRevision}
                      onPress={() => alternar({ ...d, unidadId: u.unidadId, caseta: u.codigo })}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: marcada, disabled: d.enRevision }}
                      style={({ pressed }) => [
                        e.deuda,
                        i > 0 && e.deudaSeparador,
                        marcada && { backgroundColor: '#EEF3F9' },
                        pressed && { opacity: 0.8 },
                      ]}>
                      <View style={[e.casilla, marcada && e.casillaMarcada, d.enRevision && { opacity: 0.35 }]}>
                        {marcada ? <Ionicons name="checkmark" size={16} color={colores.blanco} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={e.concepto}>
                          {d.concepto}
                          {d.periodo ? ` · ${d.periodo}` : ''}
                        </Text>
                        <View style={[e.fila, { marginTop: 3 }]}>
                          {d.enRevision ? (
                            <Etiqueta texto="Comprobante en revisión" tono="ambar" />
                          ) : (
                            <Text style={e.detalle}>Desde {fecha(d.fechaEmision)}</Text>
                          )}
                        </View>
                      </View>
                      <Text style={e.monto}>{dinero(d.monto, d.moneda)}</Text>
                    </Pressable>
                  );
                })}
              </Tarjeta>
            )}
          </View>
        ))}
      </ScrollView>

      {elegidas.length ? (
        <View style={e.barraPago}>
          <View style={{ flex: 1 }}>
            <Text style={e.barraEtiqueta}>
              {elegidas.length} {elegidas.length === 1 ? 'deuda' : 'deudas'} · Caseta {elegidas[0].caseta}
            </Text>
            <Text style={e.barraMonto}>{dinero(totalElegido, elegidas[0].moneda)}</Text>
          </View>
          <Boton
            titulo="Pagar"
            variante="acento"
            icono="qr-code-outline"
            estilo={{ minWidth: 130 }}
            onPress={() =>
              router.push({
                pathname: '/pagar',
                params: {
                  ids: elegidas.map((d) => d.id).join(','),
                  caseta: elegidas[0].caseta,
                  moneda: elegidas[0].moneda,
                  total: String(totalElegido),
                },
              })
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  saludo: { fontSize: 26, fontWeight: '700', color: colores.tinta, marginBottom: espacio.l, marginTop: espacio.s },
  resumen: { backgroundColor: colores.azul, borderRadius: radio.l, padding: espacio.xl, marginBottom: espacio.xl },
  resumenEtiqueta: { color: '#B9CCDD', fontSize: 14, fontWeight: '600' },
  resumenMonto: { color: colores.blanco, fontSize: 32, fontWeight: '700', marginTop: 4 },
  resumenNota: { color: '#B9CCDD', fontSize: 13.5, marginTop: 8, lineHeight: 19 },
  casetaCabecera: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: espacio.s },
  casetaTitulo: { fontSize: 18, fontWeight: '700', color: colores.tinta },
  casetaBloque: { fontSize: 13, color: colores.textoSuave },
  fila: { flexDirection: 'row', alignItems: 'center' },
  deuda: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: espacio.l, paddingVertical: 14, gap: 12 },
  deudaSeparador: { borderTopWidth: 1, borderTopColor: '#EEF2F6' },
  casilla: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#9FB0C2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaMarcada: { backgroundColor: colores.azulMedio, borderColor: colores.azulMedio },
  concepto: { fontSize: 15.5, fontWeight: '600', color: colores.texto },
  detalle: { fontSize: 13, color: colores.textoSuave },
  monto: { fontSize: 15.5, fontWeight: '700', color: colores.tinta },
  barraPago: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: colores.azul,
    borderRadius: radio.l,
    padding: espacio.m,
    paddingLeft: espacio.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0B1F33',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  barraEtiqueta: { color: '#B9CCDD', fontSize: 13 },
  barraMonto: { color: colores.blanco, fontSize: 20, fontWeight: '700', marginTop: 2 },
});
