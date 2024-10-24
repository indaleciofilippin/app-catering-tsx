import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { jwtDecode } from 'jwt-decode'; // Importar correctamente jwtDecode
import { getLocalUser } from '../storage/db/database';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo'; // Importar NetInfo

type User = {
    username?: string;
};

const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(true); // Estado de conexión
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const previousConnection = useRef<boolean>(true); 

    // Manejo del estado de conexión usando NetInfo
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected ?? false;

            // Verificar si hubo un cambio en el estado de conexión
            if (connected !== previousConnection.current) {
                setIsConnected(connected);
                previousConnection.current = connected;

                // Mostrar la alerta solo si hubo un cambio real en el estado de la conexión
                //Alert.alert('Conexión', connected ? 'Conectado' : 'Desconectado');
            }
        });

        return () => unsubscribe();
    }, []);
    

    // Verificar si hay conexión y token disponible para solicitar una nueva autenticación si es necesario
    useEffect(() => {
        if (isAuthenticated && !token && isConnected) {
            Alert.alert(
                'Conexión disponible',
                'Para sincronizar los datos, por favor inicia sesión nuevamente.',
                [
                    {
                        text: 'Iniciar sesión',
                        onPress: () => {
                            logout();
                        },
                    },
                ]
            );
        }
    }, [isConnected, isAuthenticated, token]);

    // Función de inicio de sesión
    const login = async (credentials: { usuario: string; password: string }) => {
        if (isConnected) {
            try {
                const formData = new URLSearchParams();
                formData.append('json', JSON.stringify(credentials));

                const response = await fetch('https://deprominsa.com.ar/lundin_test/APIapp/user_api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                if (!response.ok) {
                    throw new Error('Error en la autenticación.');
                }

                const data = await response.json();

                if (data.code !== 200) {
                    throw new Error('El usuario o la contraseña son incorrectos.');
                }

                if (data.token) {
                    // Decodificar el token para extraer el nombre y apellido
                    const decodedToken: any = jwtDecode(data.token);

                    const nombre = decodedToken.nombre;
                    const apellido = decodedToken.apellido;

                    // Almacenar el token y el nombre y apellido
                    await AsyncStorage.setItem('token', data.token);
                    await AsyncStorage.setItem('nombre', nombre);
                    await AsyncStorage.setItem('apellido', apellido);
                    await AsyncStorage.setItem('idUsuario', decodedToken.Id);

                    setToken(data.token);
                    setUser({ username: credentials.usuario });
                    setIsAuthenticated(true);
                    return true;
                } else {
                    throw new Error('No se recibió un token de autenticación.');
                }
            } catch (error: unknown) {
                if (error instanceof Error) {
                    Alert.alert('Error', error.message);
                    return false;
                } else {
                    Alert.alert('Error', 'Ha ocurrido un error desconocido.');
                    return false;
                }
            }
        } else {
            // Manejo de inicio de sesión sin conexión
            try {
                const localUser = await getLocalUser(credentials.usuario);

                if (!localUser) {
                    Alert.alert('Error', 'Usuario no encontrado.');
                    return;
                }

                // Generar el hash MD5 de la contraseña ingresada
                const hashedPassword = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.MD5,
                    credentials.password
                );

                // Comparar el hash generado con el almacenado en la base de datos
                if (hashedPassword === localUser.password) {
                    setUser({ username: localUser.usuario });
                    setIsAuthenticated(true);
                    await AsyncStorage.setItem('user', localUser.usuario);
                    await AsyncStorage.setItem('nombre', localUser.nombre);
                    await AsyncStorage.setItem('apellido', localUser.apellido);
                    await AsyncStorage.setItem('idUsuario', String(localUser.id));
                    return true;
                } else {
                    Alert.alert('Error', 'Contraseña incorrecta.');
                }
            } catch (error) {
                console.error('Error durante el login offline:', error);
                Alert.alert('Error', 'Hubo un problema al intentar acceder sin conexión.');
                return false;
            }
        }
    };
    
    // Función de cierre de sesión
    const logout = async () => {
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('lastSyncDate');
        await AsyncStorage.removeItem('nombre');
        await AsyncStorage.removeItem('apellido');
        await AsyncStorage.removeItem('idUsuario');
        navigation.navigate('Login');
        console.log('Saliste');
    };

    return {
        isAuthenticated,
        token,
        user,
        isConnected,
        login,
        logout,
    };
};

export default useAuth;