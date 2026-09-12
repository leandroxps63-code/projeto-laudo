import { registerRootComponent } from "expo";
import App from "./App";

// Não usa "expo/AppEntry" direto: esse arquivo resolve "../../App" relativo
// à própria localização, e como "expo" é hoisted pra raiz do monorepo (npm
// workspaces), esse caminho aponta pra fora de apps/mobile. Registrando o
// componente aqui mesmo, o import "./App" resolve certo independente de
// onde o pacote "expo" foi instalado.
registerRootComponent(App);
