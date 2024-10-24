import { View, Text, TouchableOpacity, Platform, SafeAreaView, StyleSheet, Alert, PermissionsAndroid } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from '../App';
import { MaterialIcons as Icon, MaterialCommunityIcons as IconC } from '@expo/vector-icons';
import CameraPermissionHandler from '../components/CameraPermissionHandler';
import { createTablesAsync, loadAndInsertDataFromAPI, syncCateringData } from '../storage/db/database';
import useAuth from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '../components/LoadingScreen'; 

export default function HomeScreen() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const { logout, isConnected } = useAuth();
    const [nombre, setNombre] = useState<string | null>(null);
    const [apellido, setApellido] = useState<string | null>(null);
    const [loading, setLoading] = useState(false); // Estado de carga

    const wasDisconnected = useRef(false); // Usamos una referencia para saber si estaba desconectado

    const checkSessionToken = async () => {
        try {
            const token = await AsyncStorage.getItem('token');

            // Mostrar alerta solo si no hay token y se acaba de recuperar la conexión (previa desconexión)
            if (!token && wasDisconnected.current) {
                Alert.alert(
                    'Conexión Recuperada',
                    'Por favor, inicie sesión nuevamente.',
                    [
                        {
                            text: 'Aceptar',
                            onPress: () => logout(), // Cerrar sesión y navegar al login
                        },
                    ],
                    { cancelable: false }
                );
            }
        } catch (error) {
            console.log('Error al verificar token de sesión', error);
        }
    };

    useEffect(() => {
        if (isConnected) {
            // Si estamos conectados y antes estábamos desconectados, verifica el token
            if (wasDisconnected.current) {
                checkSessionToken();
            }
        } else {
            // Marcamos que hubo desconexión
            wasDisconnected.current = true;
        }
    }, [isConnected]);

    useEffect(() => {
        const cargarDatosUsuario = async () => {
            const nombreGuardado = await AsyncStorage.getItem('nombre');
            const apellidoGuardado = await AsyncStorage.getItem('apellido');
            setNombre(nombreGuardado);
            setApellido(apellidoGuardado);
        };
        cargarDatosUsuario();
    }, []);

    const inicialNombre = nombre ? nombre.charAt(0).toUpperCase() : '';
    const inicialApellido = apellido ? apellido.charAt(0).toUpperCase() : '';
    

    useEffect(() => {
        if (isConnected) {
            const initDatabase = async () => {
                setLoading(true); // Activar pantalla de carga
                try {
                    await createTablesAsync();
                    await loadAndInsertDataFromAPI();
                } catch (err) {
                    console.log('error al cargar datos', err);
                } finally {
                    setLoading(false); // Desactivar pantalla de carga
                }
            };
    
            initDatabase();
        }
    }, []);

    const sincCheckin = async () => {
        if (isConnected) {
            setLoading(true); // Mostrar pantalla de carga al sincronizar
            try {
                await syncCateringData();
            } catch (err) {
                console.error("Error durante la sincronización:", err);
                Alert.alert("Error", "Hubo un problema al sincronizar los datos.");
            } finally {
                setLoading(false); // Ocultar pantalla de carga
            }
        } else {
            Alert.alert("Sin conexión", "No puedes sincronizar los datos sin conexión a internet.");
        }
    };

    if (loading) {
        // Pantalla de carga con Lottie
        return <LoadingScreen />;
    }

    return (
        <View className="flex-1 w-full">
            <StatusBar style="dark" />

            <SafeAreaView className='flex-1 m-3 mt-6'>

                <View className='flex-1 mb-0 max-h-[50px] my-3 p-2 rounded-full bg-white flex-row items-center justify-between shadow-md'>
                    <View className='flex-row items-center justify-start'>
                        <View className='h-[35px] w-[35px] rounded-full items-center justify-center bg-gray-300'>
                            <Text className='font-bold text-lg text-gray-500'>{inicialNombre}{inicialApellido}</Text>
                        </View>
                        <Text className='text-gray-500 font-semibold text-[14px] ml-2'>
                            {nombre} {apellido}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => logout()} className='h-[35px] px-3 flex-row rounded-full items-center justify-center bg-gray-200 shadow-md'>
                        <Text className='text-gray-500 font-semibold text-[14px] mr-2'>Salir</Text>
                        <Icon name="logout" size={20} color="#686868" />
                    </TouchableOpacity>
                </View>

                <View className='h-[160] w-full rounded-2xl bg-sky-600 py-4 justify-center' style={styles.shadowContainer}>
                    <Text className='text-white font-bold text-lg ml-3'>Registre comida</Text>
                    <Text className='text-white text-xs ml-3 mb-2'>Seleccione la comida que desea registrar</Text>
                    <View className='flex-row justify-center items-center h-[80]' style={styles.gap}>
                        <CameraPermissionHandler selectedMeal="Desayuno">
                            <Icon name="coffee" size={25} color="#d26703" />
                            <Text className='font-semibold text-xs'>Desayuno</Text>
                        </CameraPermissionHandler>

                        <CameraPermissionHandler selectedMeal="Almuerzo">
                            <Icon name="restaurant" size={25} color="#d26703" />
                            <Text className='font-semibold text-xs'>Almuerzo</Text>
                        </CameraPermissionHandler>

                        <CameraPermissionHandler selectedMeal="Merienda">
                            <IconC name="food-variant" size={25} color="#d26703" />
                            <Text className='font-semibold text-xs'>Merienda</Text>
                        </CameraPermissionHandler>

                        <CameraPermissionHandler selectedMeal="Cena">
                            <Icon name="lunch-dining" size={25} color="#d26703" />
                            <Text className='font-semibold text-xs'>Cena</Text>
                        </CameraPermissionHandler>
                    </View>
                </View>

                <View className='w-full h-40 mt-0 py-4 flex-row justify-between items-center'>
                    <TouchableOpacity onPress={() => navigation.navigate('VerRegistros')} className="w-[46%] h-full bg-white p-3 my-5 rounded-2xl shadow-md items-center justify-center">
                        <Text className="text-xl font-bold text-sky-500 text-center mb-1">
                            Ver registro de consumos
                        </Text>
                        <IconC name="cart-arrow-down" size={50} color="#d26703" />
                    </TouchableOpacity>

                    <TouchableOpacity className="w-[46%] h-full bg-white p-3 rounded-2xl shadow-md items-center justify-center" onPress={sincCheckin}>
                        <Text className="text-xl font-bold text-sky-500 text-center mb-1">
                            Sincronizar datos online
                        </Text>
                        <IconC name="cloud-sync" size={50} color="#d26703" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <Animated.Image
                entering={FadeInDown.duration(2000)}
                className="h-[200] w-full absolute bottom-0"
                source={require('../assets/images/bottom-montanias-1.png')}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    bottomImage: {
        position: 'absolute',
        bottom: 0,
    },
    gap: {
        gap: 16,
    },
    shadowContainer: {
        shadowColor: '#535353',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});
