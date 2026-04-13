import React, { createContext, useState, ReactNode } from 'react';

type PageType = 'Pins' | 'Routes' | 'View' | null;

interface MenuContextProps {
    activePage: PageType;
    setActivePage: (page: PageType) => void;
}

export const MenuContext = createContext<MenuContextProps | undefined>(
    undefined
);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [activePage, setActivePage] = useState<PageType>('Pins');

    return (
        <MenuContext.Provider value={{ activePage, setActivePage }}>
            {children}
        </MenuContext.Provider>
    );
};
