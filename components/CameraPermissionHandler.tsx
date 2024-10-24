import React from 'react';
import { Alert, Linking, TouchableOpacity, Platform } from 'react-native';
import { useCameraPermissions, PermissionStatus } from 'expo-camera';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../App'; // Ajustar el import según tu proyecto
import { PermissionsAndroid } from 'react-native';  // Importar permisos para Android

interface CameraPermissionHandlerProps {
  children: React.ReactNode;
  selectedMeal: string;
}

const CameraPermissionHandler: React.FC<CameraPermissionHandlerProps> = ({ children, selectedMeal }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Función que maneja la solicitud de permisos de cámara
  const handlePermission = async () => {
    if (Platform.OS === 'android') {
      // Solicitar permiso de cámara en Android
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        // Si el permiso es otorgado, navega al registro de comidas
        navigateToMealRegister();
      } else {
        // Si el permiso es denegado, muestra alerta
        showCameraPermissionAlert();
      }
    } else {
      // Solicitar permiso de cámara en iOS
      const response = await requestPermission();
      if (response.status === PermissionStatus.GRANTED) {
        // Si el permiso es otorgado, navega al registro de comidas
        navigateToMealRegister();
      } else {
        // Si el permiso es denegado, muestra alerta
        showCameraPermissionAlert();
      }
    }
  };

  // Función para navegar a la pantalla de registro de comidas
  const navigateToMealRegister = () => {
    let mealId;
    switch (selectedMeal) {
      case "Desayuno":
        mealId = 1;
        break;
      case "Almuerzo":
        mealId = 2;
        break;
      case "Merienda":
        mealId = 3;
        break;
      case "Cena":
        mealId = 4;
        break;
      default:
        mealId = 0;
    }
    navigation.navigate('MealRegister', { selectedMeal, mealId });
  };

  // Función para mostrar alerta si el permiso de cámara es denegado
  const showCameraPermissionAlert = () => {
    Alert.alert(
      'Permiso de cámara denegado',
      'Para usar la cámara, necesitas habilitar el acceso en la configuración de tu dispositivo.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Abrir Configuración',
          onPress: () => Linking.openSettings(), // Enlace a la configuración del dispositivo
        },
      ],
    );
  };

  return (
    <TouchableOpacity className='h-full w-[20%] rounded-md flex items-center justify-center bg-sky-50 aspect-square shadow-md' onPress={handlePermission}>
      {children}
    </TouchableOpacity>
  );
};

export default CameraPermissionHandler;
