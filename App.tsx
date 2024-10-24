import * as React from 'react';
import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './screens/Login';
import MealRegister from './screens/MealRegister';
import HomeScreen from './screens/HomeScreen';
import VerRegistros from './screens/VerRegistros';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

export type RootStackParamList = {
  Login: undefined;
  MealRegister: { selectedMeal: string; mealId: number };
  HomeScreen: undefined;
  VerRegistros: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        // Cargar las fuentes de react-native-vector-icons
        MaterialIcons: require('react-native-vector-icons/Fonts/MaterialIcons.ttf'),
        MaterialCommunityIcons: require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
        Ionicons: require('react-native-vector-icons/Fonts/Ionicons.ttf'),
      });
      setFontsLoaded(true);
      await SplashScreen.hideAsync(); // Oculta la pantalla de carga cuando las fuentes estén listas
    }

    async function prepare() {
      await SplashScreen.preventAutoHideAsync(); // Prevenir la ocultación automática de la pantalla de carga
      await loadFonts();
    }

    prepare();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Login' screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="MealRegister" component={MealRegister} />
        <Stack.Screen
          name="HomeScreen"
          component={HomeScreen}
          options={{ gestureEnabled: false }}  // Esto desactiva el gesto de retroceso
        />
        <Stack.Screen name="VerRegistros" component={VerRegistros} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
