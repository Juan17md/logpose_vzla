import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, arrayUnion, runTransaction, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { listaComprasSchema, itemListaSchema } from "@/lib/schemas";
import * as Sentry from "@sentry/nextjs";

export interface ShoppingItem {
    id: string;
    name: string;
    quantity: number;
    purchasedQuantity: number;
    price: number;
    completed: boolean;
}

export interface ShoppingList {
    id: string;
    userId: string;
    name: string;
    items: ShoppingItem[];
    createdAt: Timestamp | Date;
}

export const useShoppingLists = () => {
    const [lists, setLists] = useState<ShoppingList[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = auth.onAuthStateChanged((user: User | null) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (!user) {
                setLists([]);
                setLoading(false);
                return;
            }

            const q = query(
                collection(db, "shopping_lists"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc")
            );

            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as ShoppingList[];

                const sanitizedData = data.map(list => ({
                    ...list,
                    items: list.items?.map(item => ({
                        ...item,
                        purchasedQuantity: item.purchasedQuantity ?? (item.completed ? item.quantity : 0)
                    })) || []
                }));

                setLists(sanitizedData);
                setLoading(false);
            });
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const createList = async (name: string) => {
        if (!auth.currentUser) return;
        const parsed = listaComprasSchema.safeParse({ name });
        if (!parsed.success) {
            console.error("Lista inválida:", parsed.error.flatten());
            return;
        }
        return await addDoc(collection(db, "shopping_lists"), {
            userId: auth.currentUser.uid,
            ...parsed.data,
            items: [],
            createdAt: serverTimestamp()
        });
    };

    // Defensa en profundidad: las Firestore rules ya validan ownership en el
    // servidor, pero aquí se evita cualquier operación sobre listas que no
    // pertenezcan al usuario actual (los IDs de Firestore no son secretos).
    const esListaPropia = (listId: string): boolean => {
        const usuarioActual = auth.currentUser;
        if (!usuarioActual) return false;
        const lista = lists.find(l => l.id === listId);
        return !!lista && lista.userId === usuarioActual.uid;
    };

    const deleteList = async (listId: string) => {
        if (!esListaPropia(listId)) return;
        await deleteDoc(doc(db, "shopping_lists", listId));
    };

    const addItem = async (listId: string, item: Omit<ShoppingItem, "id" | "completed" | "purchasedQuantity">) => {
        if (!esListaPropia(listId)) return;
        const parsed = itemListaSchema.safeParse(item);
        if (!parsed.success) {
            console.error("Item inválido:", parsed.error.flatten());
            return;
        }
        const newItem: ShoppingItem = {
            id: crypto.randomUUID(),
            completed: false,
            purchasedQuantity: 0,
            ...parsed.data
        };
        const listRef = doc(db, "shopping_lists", listId);
        await updateDoc(listRef, {
            items: arrayUnion(newItem)
        });
    };

    const toggleItem = async (listId: string, _currentItems: ShoppingItem[], itemId: string) => {
        if (!esListaPropia(listId)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const listRef = doc(db, "shopping_lists", listId);
                const listDoc = await transaction.get(listRef);
                if (!listDoc.exists()) throw "List not found";

                const currentList = listDoc.data() as ShoppingList;
                const items = currentList.items || [];

                const updatedItems = items.map(item => {
                    if (item.id === itemId) {
                        const newCompleted = !item.completed;
                        return {
                            ...item,
                            completed: newCompleted,
                            purchasedQuantity: newCompleted ? item.quantity : 0
                        };
                    }
                    return item;
                });

                transaction.update(listRef, { items: updatedItems });
            });
        } catch (e) {
            console.error("Error toggling item:", e);
            Sentry.captureException(e);
        }
    };

    const updateItemProgress = async (listId: string, _currentItems: ShoppingItem[], itemId: string, change: number) => {
        if (!esListaPropia(listId)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const listRef = doc(db, "shopping_lists", listId);
                const listDoc = await transaction.get(listRef);
                if (!listDoc.exists()) throw "List not found";

                const currentList = listDoc.data() as ShoppingList;
                const items = currentList.items || [];

                const updatedItems = items.map(item => {
                    if (item.id === itemId) {
                        const newPurchasedQuantity = Math.max(0, Math.min(item.quantity, (item.purchasedQuantity || 0) + change));
                        const completed = newPurchasedQuantity >= item.quantity;
                        return {
                            ...item,
                            purchasedQuantity: newPurchasedQuantity,
                            completed
                        };
                    }
                    return item;
                });

                transaction.update(listRef, { items: updatedItems });
            });
        } catch (e) {
            console.error("Error updating item progress:", e);
            Sentry.captureException(e);
        }
    };

    const deleteItem = async (listId: string, _currentItems: ShoppingItem[], itemId: string) => {
        if (!esListaPropia(listId)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const listRef = doc(db, "shopping_lists", listId);
                const listDoc = await transaction.get(listRef);
                if (!listDoc.exists()) throw "List not found";

                const currentList = listDoc.data() as ShoppingList;
                const items = currentList.items || [];
                const updatedItems = items.filter(item => item.id !== itemId);

                transaction.update(listRef, { items: updatedItems });
            });
        } catch (e) {
            console.error("Error deleting item:", e);
            Sentry.captureException(e);
        }
    };

    const updateListName = async (listId: string, newName: string) => {
        if (!esListaPropia(listId)) return;
        const parsed = listaComprasSchema.safeParse({ name: newName });
        if (!parsed.success) {
            console.error("Nombre de lista inválido:", parsed.error.flatten());
            return;
        }
        const listRef = doc(db, "shopping_lists", listId);
        await updateDoc(listRef, { name: parsed.data.name });
    };

    const updateItem = async (listId: string, _currentItems: ShoppingItem[], itemId: string, updates: Partial<ShoppingItem>) => {
        if (!esListaPropia(listId)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const listRef = doc(db, "shopping_lists", listId);
                const listDoc = await transaction.get(listRef);
                if (!listDoc.exists()) throw "List not found";

                const currentList = listDoc.data() as ShoppingList;
                const items = currentList.items || [];

                const updatedItems = items.map(item => {
                    if (item.id === itemId) {
                        return { ...item, ...updates };
                    }
                    return item;
                });

                transaction.update(listRef, { items: updatedItems });
            });
        } catch (e) {
            console.error("Error updating item:", e);
            Sentry.captureException(e);
        }
    };

    const duplicateList = async (listId: string) => {
        if (!esListaPropia(listId) || !auth.currentUser) return;
        const sourceList = lists.find(l => l.id === listId);
        if (!sourceList) return;

        const newItems = sourceList.items.map(item => ({
            ...item,
            id: crypto.randomUUID(), // New ID for the new item
            completed: false,
            purchasedQuantity: 0
        }));

        await addDoc(collection(db, "shopping_lists"), {
            userId: auth.currentUser.uid,
            name: `Copia de ${sourceList.name}`,
            items: newItems,
            createdAt: serverTimestamp()
        });
    };

    return { lists, loading, createList, deleteList, addItem, toggleItem, updateItemProgress, deleteItem, updateListName, duplicateList, updateItem };
};
