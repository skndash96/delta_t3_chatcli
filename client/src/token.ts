import { chmodSync, readFile, readFileSync, writeFileSync } from "fs";
import path from "path";

const tokenPath = path.join(process.env.HOME || process.env.USERPROFILE || ".", ".chatcli");

interface StorageObject {
  token: string;
  rooms: string[];
}

export const readStorageObject = async () => {
  try {
    const string = await new Promise<string>((resolve, reject) => {
      readFile(tokenPath, { encoding: 'utf8' }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    return JSON.parse(string) as StorageObject;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('Token file not found. Please register or login first.');
      return null;
    }
    console.error('Error reading storage object:', error);
    return null;
  }
}

export const writeStorageObject = async (obj: StorageObject) => {
  try {
    await new Promise<void>((resolve, reject) => {
      writeFileSync(tokenPath, JSON.stringify(obj), { encoding: 'utf8' });
      resolve();
    });
  } catch (error) {
    console.error('Error saving storage object:', error);
  }
}

export async function saveToken(token: string) {
  const storageObject = {
    token: token,
    rooms: [],
  } as StorageObject;

  await writeStorageObject(storageObject);
}

export function saveRooms(rooms: string[]): void {
  try {
    const obj = JSON.parse(readFileSync(tokenPath, { encoding: 'utf8' }).toString()) as StorageObject;
    obj.rooms = rooms;
    writeFileSync(tokenPath, JSON.stringify(obj), { encoding: 'utf8' });
    chmodSync(tokenPath, 0o400);
    console.log('Rooms saved to', tokenPath);
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
}