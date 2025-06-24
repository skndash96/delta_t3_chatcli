export interface Room {
  roomId: string;
  ownerId: number;
  socketIds: Set<string>;
}

const activeRooms = new Map<string, Room>();

export function addSocketToRoom(roomId: string, socketId: string, ownerId: number) {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, { roomId, socketIds: new Set(), ownerId });
  }

  activeRooms.get(roomId)!.socketIds.add(socketId);
}

export function removeSocketFromRoom(roomId: string, socketId: string) {
  const room = activeRooms.get(roomId);
  if (room) {
    room.socketIds.delete(socketId);
    if (room.socketIds.size === 0) {
      activeRooms.delete(roomId);
    }
  }
}

export function getRoom(roomId: string): Room | undefined {
  return activeRooms.get(roomId);
}
