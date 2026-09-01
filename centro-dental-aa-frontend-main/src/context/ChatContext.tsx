import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatContextType {
    socket: Socket | null;
    isConnected: boolean;
    messages: Message[];
    sendMessage: (msg: string, to?: string) => void;
    senderName: string;
    activeUsers: string[];
    loginUser: (user: any) => void;
    logoutUser: () => void;
}

export interface Message {
    sender: string;
    message: string;
    to?: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

interface ChatProviderProps {
    children: ReactNode;
}

const getSocketConfig = () => {
    let url = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`;
    let path = '/socket.io';

    // Remove any trailing '/api' from the base URL since NestJS WebSockets 
    // bind to the root domain by default, not the HTTP global prefix.
    url = url.replace(/\/api\/?$/, '');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = window.location.origin;
    }
    
    url = url.replace(/\/+$/, '');
    return { url, path };
};

const SOCKET_CONFIG = getSocketConfig();

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = React.useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = localStorage.getItem('chat_messages');
        return saved ? JSON.parse(saved) : [];
    });
    const [senderName, setSenderName] = useState('');
    const [activeUsers, setActiveUsers] = useState<string[]>([]);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('chat_messages', JSON.stringify(messages));
        }
    }, [messages]);

    const connectSocket = (name: string) => {
        // Disconnect existing socket if any (using Ref for immediate check)
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const newSocket = io(SOCKET_CONFIG.url, { 
            path: SOCKET_CONFIG.path,
            transports: ['websocket', 'polling']
        });
        socketRef.current = newSocket;
        setSocket(newSocket); // Sync state

        newSocket.on('connect', () => {
            console.log('Connected to chat server');
            setIsConnected(true);
            newSocket.emit('join', name);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from chat server');
            setIsConnected(false);
            setActiveUsers([]);
        });

        newSocket.on('receiveMessage', (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });

        newSocket.on('activeUsers', (users: string[]) => {
            setActiveUsers(users);
        });
    };

    const loginUser = (user: any) => {
        setSenderName(user.name);
        connectSocket(user.name);
    };

    const logoutUser = () => {
        if (socketRef.current) {
            // Tell server we are leaving explicitly
            socketRef.current.emit('logout');
            // Give it a tiny moment to send? socket.io usually sends immediately on disconnect but explicit is safer
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setSenderName('');
        setIsConnected(false);
        setActiveUsers([]);
        setSocket(null);
        setMessages([]);
        localStorage.removeItem('chat_messages');
    };

    useEffect(() => {
        // Initial check on mount, only run once
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const parsedUser = JSON.parse(user);
                if (parsedUser) {
                    setSenderName(parsedUser.name);
                    // Delay connection slightly to avoid double-mount race in strict mode? 
                    // Or simply rely on socketRef logic. 
                    // Ideally, we shouldn't call connectSocket directly here if strict mode runs effect twice.
                    // But with socketRef logic, the second call will disconnect the first one.
                    connectSocket(parsedUser.name);
                }
            } catch (e) {
                console.error("Error parsing user from localStorage", e);
            }
        }

        return () => {
            // Cleanup on unmount
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []); // Empty dependency array = run only on mount/unmount

    // Remove the previous useEffect[socket] that was causing double cleanup/confusion

    const sendMessage = (msg: string, to?: string) => {
        if (socketRef.current && msg.trim()) {
            const payload = { sender: senderName, message: msg, to };
            socketRef.current.emit('sendMessage', payload);
        }
    };

    return (
        <ChatContext.Provider value={{ socket, isConnected, messages, sendMessage, senderName, activeUsers, loginUser, logoutUser }}>
            {children}
        </ChatContext.Provider>
    );
};
