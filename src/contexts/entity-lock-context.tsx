'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { RequestEntityLock, ResponseEntityLock } from "@/app/api/action/entity/entity_locking";

type EntityLockContextType = {
    isLocked: boolean;
    isLockedByCurrentUser: boolean;
    lockUserName: string;
    timeSpent: number,
    entityId: string;
    lock:   () => Promise<void>;
    unlock: () => Promise<void>;
};

const EntityLockContext = createContext<EntityLockContextType>({
    isLocked: false,
    isLockedByCurrentUser: false,
    lockUserName: "",
    timeSpent: 0,
    entityId: "",
    lock:     async () => {},
    unlock:   async () => {},
});

export function useEntityLock() {
    return useContext(EntityLockContext);
}

export function EntityLockProvider({ entityCode, entityId, children }: { entityCode: string, entityId: string; children: ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const [isLockedByCurrentUser, setIsLockedByCurrentUser] = useState(false)
    const [lockUserName, setLockUserName] = useState("")
    const [timeSpent, setTimeSpent] = useState(0)

    async function lock() {        
        const lock_request: RequestEntityLock = {
            entityCode: entityCode,
            entityId: entityId,
            userName: 'admin'
        }
        
        const result = await fetch(`/api/action/entity/lock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lock_request),
            })
            .then(res => { if (!res.ok) throw new Error(`Error locking entity ${JSON.stringify(res)}`); else return res.json()})
            .then(j => j as ResponseEntityLock);
        
        // If success we got the lock
        if (result.success) {
            setIsLocked(true);
            setIsLockedByCurrentUser(true);
            setLockUserName(result.data.userName);
            setTimeSpent(result.data.totalTimeSpent)
        }
        // Someone else has the lock on the current entity
        else {
            setIsLocked(true);
            setIsLockedByCurrentUser(false);
            setLockUserName(result.data.userName);
            setTimeSpent(0);
        }
    };

    async function unlock() {        
        const lock_request: RequestEntityLock = {
            entityCode: entityCode,
            entityId: entityId,
            userName: 'admin'
        };

        const result = await fetch(`/api/action/entity/unlock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lock_request),
        })
        .then(res => { if (!res.ok) throw new Error('Error locking entity'); else return res.json()})
        .then(j => j as ResponseEntityLock);
        setIsLocked(false);
        setIsLockedByCurrentUser(false);
        setLockUserName("");
        setTimeSpent(0);
    };

    // 1) lock on mount; 2) unlock on unmount
    useEffect(() => {
        lock().catch(console.error);
        return () => {
            unlock().catch(console.error);
        };
    }, [entityId]);

    // also catch browser-level exits and back/forward
    useEffect(() => {
        const onBeforeUnload = () => { unlock(); };
        const onPopState     = () => { unlock(); };

        window.addEventListener("beforeunload", onBeforeUnload);
        window.addEventListener("popstate",     onPopState);

        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            window.removeEventListener("popstate",     onPopState);
        };
    }, []);

    // Update timer every second
    useEffect(() => {
        if (!isLockedByCurrentUser) return;
        const interval = setInterval(() => {
            setTimeSpent((prev) => prev + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [isLockedByCurrentUser])

    const value = {
        isLocked,
        isLockedByCurrentUser,
        lockUserName,
        timeSpent,
        entityId,
        lock,
        unlock
    };

    return (
        <EntityLockContext.Provider value={value}>
            {children}
        </EntityLockContext.Provider>
    );
}