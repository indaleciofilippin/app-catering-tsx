// dbSetup.ts
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { User } from '../../screens/MealRegister'
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Alert } from 'react-native';

const baseUrl = process.env.TEST_API_URL;

// Guardar la fecha de la última sincronización
const saveLastSyncDate = async (date: string) => {
    try {
        await AsyncStorage.setItem('lastSyncDate', date);
    } catch (error) {
        console.error('Error al guardar la fecha de sincronización:', error);
    }
};

// Recuperar la fecha de la última sincronización
const getLastSyncDate = async () => {
    try {
        const lastSyncDate = await AsyncStorage.getItem('lastSyncDate');
        console.log('fecha sync', lastSyncDate);
        if (lastSyncDate) {
            return lastSyncDate;
        } else {
            return '1970-01-01';
        } // Retorna una fecha antigua si no existe
    } catch (error) {
        console.error('Error al obtener la fecha de sincronización:', error);
        return '1970-01-01'; // En caso de error, usar una fecha antigua
    }
};

const databasePath = `${FileSystem.documentDirectory}SQLite/catering.db`;

// Función para eliminar la base de datos
const deleteDatabase = async () => {
    try {
        // Elimina el archivo de la base de datos
        await FileSystem.deleteAsync(databasePath, { idempotent: true });
        console.log('Base de datos eliminada exitosamente.');

        // Opcional: Re-crear la base de datos
        // Puedes llamar aquí a tu función de creación de tablas si es necesario
        // createTablesAsync(); 
    } catch (error) {
        console.error('Error al eliminar la base de datos:', error);
    }
};

// Llama a la función para eliminar la base de datos
deleteDatabase();

export const createTablesAsync = async (): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync('catering.db');
        await db.withTransactionAsync(async () => {
            // Habilitar las claves foráneas
            await db.execAsync(
                'PRAGMA foreign_keys = ON;'
            );
            console.log('Claves foráneas habilitadas');

            // Crear la tabla usuarios
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario TEXT NOT NULL,
                    password TEXT NOT NULL,
                    apellido TEXT NOT NULL,
                    nombre TEXT NOT NULL,
                    acceso TEXT NOT NULL
                );`
            );
            console.log('Tabla usuarios creada o ya existe');

            // Crear la tabla la_personal
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS la_personal (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cuil TEXT NOT NULL,
                    apellido TEXT NOT NULL,
                    nombre TEXT NOT NULL
                );`
            );
            console.log('Tabla la_personal creada o ya existe');

            // Crear la tabla catering_servicio
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS catering_servicio (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cod TEXT NOT NULL,
                    nombre TEXT NOT NULL,
                    hinicio TIME NOT NULL,
                    hfin TIME NOT NULL
                );`
            );
            console.log('Tabla catering_servicio creada o ya existe');

            // Crear la tabla catering_checkin_local
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS catering_checkin_local (
                    id TEXT PRIMARY KEY,
                    idcred INTEGER NOT NULL,
                    idservicio INTEGER NOT NULL,
                    fingreso DATE NOT NULL,
                    hingreso TIME NOT NULL,
                    sincronizado BOOLEAN NOT NULL DEFAULT 1,
                    FOREIGN KEY (idcred) REFERENCES credencial_personal(id),
                    FOREIGN KEY (idservicio) REFERENCES catering_servicio(id)
                );`
            );
            console.log('Tabla catering_checkin_local creada o ya existe');

            // Crear la tabla credencial_personal
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS credencial_personal (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    personas_id INTEGER NOT NULL,
                    idempresa INTEGER NOT NULL,
                    idproyecto_vinculo INTEGER NOT NULL,
                    carnet TEXT NOT NULL,
                    estado TEXT NOT NULL,
                    FOREIGN KEY (personas_id) REFERENCES la_personal(id),
                    FOREIGN KEY (idempresa) REFERENCES empresa(id)
                );`
            );
            console.log('Tabla credencial_personal creada o ya existe');

            // Crear la tabla empresa
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS empresa (
                    id INTEGER INTEGER NOT NULL,
                    rs TEXT NOT NULL,
                    cuit TEXT NOT NULL,
                    idproyecto INTEGER NOT NULL,
                    PRIMARY KEY (id, idproyecto)
                );`
            );
            console.log('Tabla empresa creada o ya existe');
        });
    } catch (error) {
        console.error('Error al crear tablas:', error);
        throw error;
    }
};

export const loadAndInsertDataFromAPI = async () => {
    try {
        // Hacer la petición GET a la API para obtener los datos
        const apiData = await fetchDataFromAPI();

        if (apiData) {
            // Insertar datos en las tablas correspondientes
            await insertDataFromJSON(apiData.datos.empresas, 'empresa', ['id', 'rs', 'cuit', 'idproyecto']);
            await insertDataFromJSON(apiData.datos.personas, 'la_personal', ['id', 'cuil', 'apellido', 'nombre']);
            await insertDataFromJSON(apiData.datos.servicios, 'catering_servicio', ['id', 'cod', 'nombre', 'hinicio', 'hfin']);

            await insertDataFromJSON(apiData.datos.credenciales, 'credencial_personal', ['id', 'personas_id', 'idempresa', 'idproyecto_vinculo', 'carnet', 'estado']);
            await insertDataFromJSON(apiData.datos.checkin, 'catering_checkin_local', ['id', 'idcred', 'idservicio', 'fingreso', 'hingreso']);
            await insertDataFromJSON(apiData.datos.users, 'usuarios', ['id', 'usuario', 'password', 'apellido', 'nombre', 'acceso']);



            // Guardar la fecha actual como la última sincronización
            const currentDate = new Date().toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires', // Establecer la zona horaria
                hour12: false, // Para formato de 24 horas
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });

            const formattedDate = currentDate.replace(',', '').split(' ')[0].split('/').reverse().join('-') + ' ' + currentDate.split(' ')[1];
            // Obtener fecha actual
            await saveLastSyncDate(formattedDate);

            console.log('Datos sincronizados e insertados correctamente.', formattedDate);
        } else {
            console.log('No se recibieron datos de la API.');
        }
    } catch (error) {
        console.error('Error al sincronizar e insertar datos desde la API:', error);
    }
};

const fetchDataFromAPI = async () => {
    try {
        const token = await AsyncStorage.getItem('token'); // Obtiene el token almacenado
        const lastSync = await getLastSyncDate(); // Obtiene la última sincronización almacenada

        if (!token) {
            console.log('No se encontró el token');
            return;
        }

        if (!lastSync) {
            console.log('No se encontró la última sincronización');
            return;
        }

        const url = `${baseUrl}/catering.php?last_check=${lastSync}`;// Construye la URL con la última sincronización

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Authorization': token, // Se incluye el token aquí
            },
        });

        console.log('url:', url);

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error durante la sincronización:', error);
    }
};

export const insertDataFromJSON = async (data: any[], tableName: string, columns: string[]): Promise<void> => {
    const db = await SQLite.openDatabaseAsync('catering.db');

    try {
        // Iniciar la transacción
        await db.withTransactionAsync(async () => {
            // Preparar la declaración SQL
            const placeholders = columns.map(() => '?').join(', ');
            const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

            // Dividir los datos en lotes
            const batchSize = 1000; // Ajusta el tamaño del lote según tu necesidad
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize); // Obtener un lote de datos

                // Crear los valores de cada fila
                const values = batch.map(row => {
                    if (tableName === 'catering_checkin_local') {
                        const newId = Crypto.randomUUID(); // Generar UUID
                        return columns.map(column => row[column] || newId); // Usar el UUID generado
                    }
                    return columns.map(column => row[column]);
                });

                // Ejecutar la inserción en lote
                await Promise.all(values.map(value => db.runAsync(sql, value)));
            }
        });

        console.log(`Datos insertados en la tabla ${tableName} correctamente.`);

        // Consultar los datos insertados para verificar
        const insertedData = await db.getAllAsync(`SELECT * FROM ${tableName}`);
        console.log(`Datos en la tabla ${tableName}:`, insertedData);
    } catch (error) {
        console.log(`Datos NO insertados en la tabla ${tableName} correctamente.`);
        console.error(`Error al insertar datos en la tabla ${tableName}:`, error);
        throw error;
    }
};




export const syncCateringData = async () => {
    try {
        const db = await SQLite.openDatabaseAsync('catering.db');
        const token = await AsyncStorage.getItem('token');

        if (!token) {
            console.log('No se encontró el token');
            return;
        }

        let usersResult: any[] = [];

        // Obtener el idUsuario desde AsyncStorage
        const userId = await AsyncStorage.getItem('idUsuario');
        if (!userId) {
            console.error('Error: idUsuario no encontrado en AsyncStorage');
            return;
        }

        // Iniciar una transacción para obtener los registros no sincronizados
        await db.withTransactionAsync(async () => {
            const checkins = await db.getAllAsync(
                `SELECT ccl.id, ccl.fingreso AS fecha, ccl.hingreso AS hora, ccl.idcred AS identif, 
                        ccl.idservicio AS idtipo
                 FROM catering_checkin_local ccl
                 WHERE ccl.sincronizado = 0`
            );
            usersResult = checkins.length > 0 ? checkins : [];
        });

        if (usersResult.length === 0) {
            console.log('No hay datos para sincronizar.');
            Alert.alert('Fue sincronizado', 'No hay datos a sincronizar actualmente.');
            return;
        }

        // Crear un array de payloads
        const payloadArray = usersResult.map((checkin: any) => ({
            id: checkin.id,               // Convertir id a cadena
            fecha: checkin.fecha,
            hora: checkin.hora,
            identif: checkin.identif.toString(),     // Convertir identif a cadena
            idtipo: checkin.idtipo.toString(),       // Convertir idtipo a cadena
            idempresa: "",
            comentario: "",
            foperacion: checkin.fecha,
            hoperacion: checkin.hora,
            idoperador: userId.toString(),           // Convertir idoperador a cadena
        }));

        console.log('payloadArray', payloadArray);

        // Enviar el array completo en una sola solicitud POST
        const url = `${baseUrl}/catering.php`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Authorization': token,
            },
            body: JSON.stringify(payloadArray),  // Enviar el array de payloads
        });

        // Verificar el contenido de la respuesta antes de parsearlo
        const responseText = await response.text();  // Leer como texto para ver qué está devolviendo el servidor
        console.log('Raw response:', responseText);

        try {
            const data = JSON.parse(responseText); // Intentar convertirlo a JSON si es posible
            console.log('Parsed JSON response:', data);
        } catch (error) {
            console.error('Error al parsear la respuesta como JSON:', error);
            throw new Error('La respuesta no es un JSON válido');
        }

        if (!response.ok) {
            throw new Error(`Error en la sincronización: ${response.status}`);
        }

        // Si la sincronización fue exitosa, actualizar el campo "sincronizado"
        await db.withTransactionAsync(async () => {
            await db.execAsync(
                `UPDATE catering_checkin_local
                 SET sincronizado = 1
                 WHERE sincronizado = 0`
            );
        });

        console.log('Sincronización completada exitosamente');
    } catch (error) {
        console.error('Error al sincronizar datos:', error);
        throw error;
    }
};

export const getLocalUser = async (username: string): Promise<any> => {
    const db = await SQLite.openDatabaseAsync('catering.db');
    if (!db) {
        throw new Error('No se pudo abrir la base de datos.');
    }

    try {
        const result = await db.getFirstAsync(
            'SELECT * FROM usuarios WHERE usuario = ?',
            [username]
        );

        if (result) {
            return result;
        } else {
            throw new Error('Usuario no encontrado.');
        }
    } catch (error) {
        console.error('Error al ejecutar la consulta SQL:', error);
        throw error;
    }
};

export const fetchTableData = async (tableName: string): Promise<any[]> => {
    const db = await SQLite.openDatabaseAsync('catering.db');

    try {
        const result = await db.getAllAsync(`SELECT * FROM ${tableName} ORDER BY idproyecto`);

        return result;
    } catch (error) {
        console.error('Error al ejecutar la consulta SQL:', error);
        throw error;
    }
};

export const getUserByQRCode = async (qrCode: string, serviceId: number) => {
    const db = await SQLite.openDatabaseAsync('catering.db');

    try {
        const result = await db.getFirstAsync<User>(
            `SELECT p.id AS personal_id, p.nombre, p.apellido, p.cuil, c.id AS credencial_id 
             FROM la_personal p 
             JOIN credencial_personal c ON p.id = c.personas_id 
             WHERE c.estado = "HABILITADO" AND c.carnet = ?`,
            [qrCode]
        );

        if (result) {
            const user = result as User;
            const idcred = user.credencial_id;
            const fingreso = new Date().toISOString().split('T')[0];

            const checkResult = await db.getFirstAsync(
                `SELECT * FROM catering_checkin_local WHERE idcred = ? AND idservicio = ? AND fingreso = ?`,
                [idcred, serviceId, fingreso]
            );

            if (checkResult) {
                console.log('El empleado ya consumió esta comida del día.');
                return user;
            } else {
                const hingreso = new Date().toLocaleTimeString('es-AR', {
                    hour12: false,  // Para formato de 24 horas
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
                await db.runAsync(
                    `INSERT INTO catering_checkin_local (idcred, idservicio, fingreso, hingreso, sincronizado) VALUES (?, ?, ?, ?, 0)`,
                    [idcred, serviceId, fingreso, hingreso]
                );
                console.log('Datos insertados en catering_checkin_local correctamente.', serviceId);
                return user;
            }
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error al ejecutar la consulta SQL:', error);
        throw error;
    }
};

export const getUsersByPartialCuil = async (cuil: string): Promise<any[]> => {
    const db = await SQLite.openDatabaseAsync('catering.db');

    let usersResult: any[] = []; // Inicializar un array para almacenar los resultados

    try {
        // Iniciar una transacción
        await db.withTransactionAsync(async () => {
            // Ejecuta la consulta para obtener la información de la credencial y el personal a partir del CUIL
            const result = await db.getAllAsync(
                `SELECT p.id AS personal_id, p.nombre, p.apellido, p.cuil, c.id AS credencial_id 
                 FROM la_personal p 
                 JOIN credencial_personal c ON p.id = c.personas_id 
                 WHERE c.estado = "HABILITADO" AND p.cuil LIKE ?`,
                [`%${cuil}%`]
            );

            // Asignar el resultado a la variable externa
            usersResult = result.length > 0 ? result : [];
        });

        return usersResult; // Retornar los resultados fuera de la transacción

    } catch (error) {
        console.error('Error al ejecutar la consulta SQL:', error);
        throw error;
    }
};

export const insertUserCheckin = async (user: User, serviceId: number): Promise<void> => {
    const db = await SQLite.openDatabaseAsync('catering.db');
    const fingreso = new Date().toISOString().split('T')[0]; // Fecha actual (YYYY-MM-DD)
    const idcred = user.credencial_id;

    try {
        // Iniciar una transacción
        await db.withTransactionAsync(async () => {
            // Verificar si ya existe un registro para esta credencial en el mismo servicio y día
            const checkResult = await db.getFirstAsync(
                `SELECT * FROM catering_checkin_local WHERE idcred = ? AND idservicio = ? AND fingreso = ?`,
                [idcred, serviceId, fingreso]
            );

            if (checkResult) {
                console.log('El empleado ya consumió esta comida del día.');
                return; // Ya registrado
            } else {
                // Insertar el nuevo registro
                const hingreso = new Date().toLocaleTimeString('es-AR', {
                    hour12: false,  // Para formato de 24 horas
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
                await db.runAsync(
                    `INSERT INTO catering_checkin_local (idcred, idservicio, fingreso, hingreso, sincronizado) 
                     VALUES (?, ?, ?, ?, 0)`,
                    [idcred, serviceId, fingreso, hingreso]
                );
                console.log('Datos insertados en catering_checkin_local correctamente.', idcred);
            }
        });

    } catch (error) {
        console.error('Error al insertar el check-in:', error);
        throw error;
    }
};

export const getRegisteredUsersForToday = async (mealId: number): Promise<any[]> => {
    const db = await SQLite.openDatabaseAsync('catering.db');
    const today = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

    let users: any[] = []; // Variable para almacenar los resultados

    try {
        // Iniciar la transacción
        await db.withTransactionAsync(async () => {
            const result = await db.getAllAsync(
                `SELECT p.id AS personal_id, p.nombre, p.apellido, ccl.hingreso, cp.id AS credencial_id 
                 FROM catering_checkin_local ccl 
                 JOIN credencial_personal cp ON ccl.idcred = cp.id 
                 JOIN la_personal p ON cp.personas_id = p.id
                 WHERE ccl.idservicio = ? AND ccl.fingreso = ? 
                 ORDER BY ccl.hingreso DESC
                 LIMIT 10`,
                [mealId, today]
            );

            users = result; // Almacenar los resultados en la variable externa
        });

        return users; // Retornar los usuarios después de que la transacción haya finalizado

    } catch (error) {
        console.error('Error al obtener los usuarios registrados:', error);
        throw error;
    }
};

export const deleteUserCheckin = async (user: User, mealId: number): Promise<void> => {
    const db = await SQLite.openDatabaseAsync('catering.db');
    const fingreso = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

    try {
        // Iniciar la transacción
        await db.withTransactionAsync(async () => {
            await db.runAsync(
                `DELETE FROM catering_checkin_local WHERE idcred = ? AND idservicio = ? AND fingreso = ?`,
                [user.credencial_id, mealId, fingreso]
            );
        });

        console.log('Registro eliminado - user:', user.credencial_id, user.nombre, user.apellido, '- Servicio:', mealId);

    } catch (error) {
        console.error('Error al eliminar el registro:', error);
        throw error;
    }
};

export const getFilteredCheckins = async (
    date?: string,
    serviceId?: number,
    nameSurnameOrCuil?: string
): Promise<User[]> => {
    const db = await SQLite.openDatabaseAsync('catering.db');
    let query = `
        SELECT p.cuil, p.nombre, p.apellido, ccl.idservicio, ccl.fingreso 
        FROM catering_checkin_local ccl
        JOIN credencial_personal c ON c.id = ccl.idcred
        JOIN la_personal p ON p.id = c.personas_id
    `;
    const params: (string | number)[] = [];

    let users: any[] = [];

    // Filtrar por fecha, servicio o cuil/nombre/apellido
    if (date || serviceId || nameSurnameOrCuil) {
        query += ` WHERE `;
        if (date) {
            query += `ccl.fingreso = ?`;
            params.push(date);
        }
        if (serviceId) {
            if (date) query += ` AND `;
            query += `ccl.idservicio = ?`;
            params.push(serviceId);
        }
        if (nameSurnameOrCuil) {
            if (date || serviceId) query += ` AND `;
            query += `
                (
                  REPLACE(p.cuil, ' ', '') LIKE ?
                  OR
                  REPLACE(p.nombre || ' ' || p.apellido, ' ', '') LIKE ?
                  OR
                  REPLACE(p.apellido || ' ' || p.nombre, ' ', '') LIKE ?
                )
            `;
            const searchParam = `%${nameSurnameOrCuil.replace(/\s+/g, '')}%`;
            params.push(searchParam, searchParam, searchParam);
        }
    }

    // Ordenar por fecha y hora
    query += ` ORDER BY ccl.fingreso DESC, ccl.hingreso DESC`;

    try {
        // Iniciar la transacción y ejecutar la consulta
        await db.withTransactionAsync(async () => {
            const checkins = await db.getAllAsync(query, params);
            users = checkins;
        });

        return users as User[];

    } catch (error) {
        console.error('Error al obtener los checkins filtrados:', error);
        throw error;
    }
};

export const getAllCheckins = async (): Promise<User[]> => {
    const db = await SQLite.openDatabaseAsync('catering.db');
    const query = `
        SELECT p.cuil, p.nombre, p.apellido, ccl.idservicio, ccl.fingreso  
        FROM la_personal p
        JOIN credencial_personal c ON p.id = c.personas_id
        JOIN catering_checkin_local ccl ON c.id = ccl.idcred
        ORDER BY ccl.fingreso DESC, ccl.hingreso DESC
    `;

    let users: any[] = [];

    try {
        // Ejecutar la consulta dentro de una transacción
        const result = await db.withTransactionAsync(async () => {
            const checkins = await db.getAllAsync(query);
            users = checkins;
        });

        return users as User[];

    } catch (error) {
        console.error('Error al obtener todos los checkins:', error);
        throw error;
    }
};