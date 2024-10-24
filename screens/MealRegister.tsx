import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { getUserByQRCode, getUsersByPartialCuil, getRegisteredUsersForToday, deleteUserCheckin, insertUserCheckin } from '../storage/db/database';

export interface User {
    personal_id: number;
    credencial_id: number;
    nombre: string;
    apellido: string;
    cuil: string;
    idservicio: number;
    fingreso: string;
}

const MealRegister = () => {
    const route = useRoute<RouteProp<RootStackParamList, 'MealRegister'>>();
    const { selectedMeal, mealId } = route.params;
    const [facing, setFacing] = useState<CameraType>('back');
    const [scannedItems, setScannedItems] = useState<User[]>([]);
    const [manualInput, setManualInput] = useState('');
    const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
    const [scanned, setScanned] = useState(false);
    const [cameraActive, setCameraActive] = useState(true); // Estado para controlar la cámara
    const navigation = useNavigation();

    useEffect(() => {
        const fetchRegisteredUsers = async () => {
            try {
                const result = await getRegisteredUsersForToday(mealId);
                const users = result as User[];
                setScannedItems(users);
            } catch (error) {
                Alert.alert('Error', 'No se pudieron cargar los usuarios registrados.');
            }
        };

        fetchRegisteredUsers();
    }, [mealId]);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;

        try {
            const result: unknown = await getUserByQRCode(data, mealId);
            const user = result as User | null;

            if (!user) {
                setScanned(true);
                Alert.alert('Usuario no encontrado', 'El código QR no corresponde a ningún empleado.', [
                    { text: 'OK', onPress: () => setScanned(false) },
                ]);
                return;
            }

            if (scannedItems.some(item => item.nombre === user.nombre && item.apellido === user.apellido && item.personal_id === user.personal_id)) {
                setScanned(true);
                Alert.alert(
                    'Código ya escaneado',
                    'Este código QR ya ha sido leído.',
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                );
            } else {
                setScannedItems([user, ...scannedItems]);
                setScanned(true);
                setTimeout(() => {
                    setScanned(false);
                }, 2000);
            }
        } catch (error) {
            Alert.alert('Error', 'Error al consultar la base de datos.');
        }
    };

    const handleManualInput = (input: string) => {
        setManualInput(input);
        setCameraActive(false); // Desactiva la cámara si hay texto en el input

        if (input.trim().length >= 5) {
            (async () => {
                try {
                    const result: unknown = await getUsersByPartialCuil(input);
                    const users = result as User[];

                    if (users && users.length > 0) {
                        setSuggestedUsers(users);
                    } else {
                        setSuggestedUsers([]);
                    }
                } catch (error) {
                    Alert.alert('Error', 'Error al consultar la base de datos.');
                }
            })();
        } else {
            setSuggestedUsers([]);
        }
    };

    const handleUserSelection = async (user: User, serviceId: number) => {
        try {
            // Verificar si el usuario ya fue registrado en el estado local (scannedItems)
            if (scannedItems.some(item => item.personal_id === user.personal_id)) {
                Alert.alert(
                    'Usuario ya registrado',
                    'Este usuario ya ha sido registrado en la comida de hoy.',
                    [
                        {
                            text: 'OK', onPress: () => {
                                setManualInput('');  // Limpiar el input manual
                                setSuggestedUsers([]);  // Limpiar la lista de sugeridos
                            }
                        }
                    ]
                );
            } else {
                // Intentar registrar al usuario en la base de datos
                await insertUserCheckin(user, serviceId);

                // Si el registro es exitoso, agregar el usuario a la lista de escaneados
                setScannedItems([user, ...scannedItems]);

                // Limpiar el input manual, la lista de sugerencias y activar la cámara
                setManualInput('');
                setSuggestedUsers([]);
            }
        } catch (error) {
            Alert.alert('Error', 'Error al registrar el usuario en la base de datos.');
            console.error(error);
        }
    };


    const handleDeleteItem = async (item: User) => {
        Alert.alert(
            'Confirmar eliminación',
            `¿Estás seguro de que deseas eliminar a "${item.nombre} ${item.apellido}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    onPress: async () => {
                        try {
                            await deleteUserCheckin(item, mealId);
                            setScannedItems(scannedItems.filter(scannedItem => scannedItem.personal_id !== item.personal_id));
                        } catch (error) {
                            Alert.alert('Error', 'Error al eliminar el usuario de la base de datos.');
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const capitalizeFirstLetter = (text: string) => {
        return text
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <View className="h-full w-full flex justify-between">
            <View className='flex p-1 mt-12 left-5 w-8 h-8 bg-white items-center justify-center rounded-full absolute z-10'>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={22} color="#3496ff" />
                </TouchableOpacity>
            </View>
            <View className='flex p-1 mt-12 right-5 w-8 h-8 bg-white items-center justify-center rounded-full absolute z-10'>
                <TouchableOpacity onPress={() => setCameraActive((prev) => !prev)}>
                    <Icon name="photo-camera" size={22} color="#3496ff" />
                </TouchableOpacity>
            </View>
            {cameraActive ? (
                <CameraView
                    style={styles.camera}
                    facing={facing}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                >
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                            <Text style={styles.text}>{selectedMeal}</Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            ) : (
                <View style={styles.cameraHidden} /> // Oculta la cámara
            )}
            <View style={styles.container}>
                <View style={styles.inputContainer} className="shadow-md flex items-center max-h-52">
                    <View className="bg-black/5 rounded-lg flex h-12 w-full">
                        <TextInput
                            className="font-semibold p-4 text-black"
                            placeholder="Ingresar manualmente"
                            placeholderTextColor={'#858585'}
                            value={manualInput}
                            selectionColor={'#000000'}
                            onChangeText={handleManualInput}
                        />
                    </View>

                    {suggestedUsers.length > 0 && (
                        <View className='flex mt-3 max-h-32 items-center justify-center'>
                            <FlatList
                                data={suggestedUsers}
                                keyExtractor={(item) => `${item.credencial_id}`}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleUserSelection(item, mealId)}
                                        style={styles.suggestionItem}
                                    >
                                        <Text style={styles.suggestionText}>{capitalizeFirstLetter(item.nombre)} {capitalizeFirstLetter(item.apellido)} - {item.cuil}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}

                </View>

                <FlatList
                    data={scannedItems}
                    keyExtractor={(item) => `${item.personal_id}-${item.credencial_id}`}
                    renderItem={({ item }) => (
                        <View style={styles.itemContainer}>
                            <View className='flex-1 flex-row items-center flex-nowrap'>
                                <Icon name="person" size={25} color="#333" style={styles.icon} />
                                <Text style={styles.itemText} className='ml-[10] font-semibold'>
                                    {capitalizeFirstLetter(item.nombre)} {capitalizeFirstLetter(item.apellido)}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteItem(item)} className=" bg-gray-100 p-2 items-center rounded-full shadow-md">
                                <Icon name="delete" size={20} color="#ee0000" style={styles.icon} />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f7f7f7',
    },
    camera: {
        flex: 1,
    },
    cameraHidden: {
        height: 90,
        backgroundColor: '#f7f7f7',
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
    },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    inputContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginHorizontal: 15,
        marginBottom: 10,
    },
    suggestionItem: {
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        borderRadius: 10,
        shadowColor: '#535353',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        marginBottom: 5,
        marginHorizontal: 5,
    },
    suggestionText: {
        color: '#333',
    },
    itemContainer: {
        backgroundColor: '#fff',
        padding: 10,
        marginHorizontal: 15,
        marginTop: 10,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#535353',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    itemText: {
        color: '#333',
    },
    icon: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
});

export default MealRegister;
