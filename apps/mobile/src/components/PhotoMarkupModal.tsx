import { useRef, useState, type ElementRef } from "react";
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
} from "react-native";
import SvgOriginal, { Polyline as PolylineOriginal } from "react-native-svg";
import ViewShot from "react-native-view-shot";

// react-native-svg 15.x ainda tipa os componentes como class component
// legado (2 generics), incompatível com o `Component<P, S, SS>` (3
// generics) do @types/react 19.x usado pelo app — funciona perfeitamente
// em runtime (testado em dispositivo real), é só o typecheck que não
// reconhece. Cast local em vez de mexer no pacote de terceiros.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Svg = SvgOriginal as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Polyline = PolylineOriginal as any;

type Point = { x: number; y: number };
type Stroke = Point[];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CANVAS_HEIGHT = Math.min(SCREEN_HEIGHT * 0.6, 520);

type Props = {
  visible: boolean;
  photoUri: string | null;
  onConfirm: (markedUri: string) => void;
};

/**
 * Desenho livre em vermelho sobre a foto recém-tirada, pra apontar/circular
 * o problema (RF pendente do MVP original: "marcação na foto"). Ao
 * confirmar, a marcação é "queimada" na imagem via react-native-view-shot
 * — o upload subsequente trata isso como uma foto normal, sem precisar
 * guardar as marcações separadamente.
 */
export default function PhotoMarkupModal({ visible, photoUri, onConfirm }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const viewShotRef = useRef<ElementRef<typeof ViewShot>>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setCurrentStroke((prev) => {
          if (prev.length > 1) setStrokes((s) => [...s, prev]);
          return [];
        });
      },
    })
  ).current;

  function reset() {
    setStrokes([]);
    setCurrentStroke([]);
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  async function handleConfirm() {
    if (strokes.length === 0 || !viewShotRef.current?.capture) {
      // nada desenhado — usa a foto original sem gerar uma cópia à toa
      if (photoUri) onConfirm(photoUri);
      reset();
      return;
    }
    const uri = await viewShotRef.current.capture();
    onConfirm(uri);
    reset();
  }

  function handleSkip() {
    if (photoUri) onConfirm(photoUri);
    reset();
  }

  if (!photoUri) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Marque o problema na foto</Text>
        <Text style={styles.subtitle}>Desenhe com o dedo pra apontar ou circular a anomalia (opcional)</Text>

        <ViewShot
          ref={viewShotRef}
          style={styles.canvas}
          options={{ format: "jpg", quality: 0.85 }}
        >
          <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
            <Svg style={StyleSheet.absoluteFill}>
              {strokes.map((stroke, i) => (
                <Polyline
                  key={i}
                  points={stroke.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#e11d1d"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentStroke.length > 1 && (
                <Polyline
                  points={currentStroke.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#e11d1d"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>
        </ViewShot>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleUndo} disabled={strokes.length === 0}>
            <Text style={[styles.secondaryButtonText, strokes.length === 0 && styles.disabledText]}>
              Desfazer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
            <Text style={styles.secondaryButtonText}>Pular marcação</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>Usar esta foto</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#171b1f", padding: 16, paddingTop: 56, gap: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  subtitle: { color: "#c9c3b4", fontSize: 12.5 },
  canvas: {
    width: SCREEN_WIDTH - 32,
    height: CANVAS_HEIGHT,
    backgroundColor: "#000",
    borderRadius: 10,
    overflow: "hidden",
    alignSelf: "center",
  },
  image: { width: "100%", height: "100%" },
  toolbar: { flexDirection: "row", gap: 10, marginTop: 8 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.3,
    borderColor: "#4a4f55",
    borderRadius: 9,
    padding: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  disabledText: { color: "#6b7176" },
  primaryButton: { backgroundColor: "#e11d1d", borderRadius: 10, padding: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
