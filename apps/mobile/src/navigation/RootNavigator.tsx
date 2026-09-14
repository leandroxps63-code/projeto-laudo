import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "../screens/DashboardScreen";
import SelecionarClienteScreen from "../screens/SelecionarClienteScreen";
import NovaVistoriaScreen from "../screens/NovaVistoriaScreen";
import VistoriaDetalheScreen from "../screens/VistoriaDetalheScreen";
import LogoutButton from "../components/LogoutButton";

export type RootStackParamList = {
  Dashboard: undefined;
  SelecionarCliente: undefined;
  NovaVistoria: undefined;
  VistoriaDetalhe: { inspectionId: string; buildingName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Navegação do app autenticado — mostrada só quando há sessão (ver App.tsx). */
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#f8f6f2" },
          headerShadowVisible: false,
          headerTintColor: "#171b1f",
          headerTitleStyle: { fontWeight: "800" },
          headerRight: () => <LogoutButton />,
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Meus laudos" }} />
        <Stack.Screen
          name="SelecionarCliente"
          component={SelecionarClienteScreen}
          options={{ title: "Nova vistoria" }}
        />
        <Stack.Screen
          name="NovaVistoria"
          component={NovaVistoriaScreen}
          options={{ title: "Cliente novo" }}
        />
        <Stack.Screen
          name="VistoriaDetalhe"
          component={VistoriaDetalheScreen}
          options={({ route }) => ({ title: route.params.buildingName })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
