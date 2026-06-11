import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { translations, type Language } from '@/data/translations';

const SAVED_LANGUAGES = new Set<Language>(['en', 'id', 'zh', 'hi', 'es']);


// Helper type for nested keys
type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<typeof translations.en>;

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>(() => {
        try {
            const saved = localStorage.getItem('language');
            if (saved && SAVED_LANGUAGES.has(saved as Language)) return saved as Language;
        } catch {
            /* private mode / denied */
        }
        return 'en';
    });

    useEffect(() => {
        try {
            localStorage.setItem('language', language);
        } catch {
            /* ignore */
        }
    }, [language]);

    const t = (key: TranslationKey): string => {
        const keys = key.split('.');
        let value: unknown = translations[language];

        for (const k of keys) {
            if (value == null || typeof value !== 'object') {
                value = undefined;
                break;
            }
            value = (value as Record<string, unknown>)[k];
        }

        return typeof value === 'string' ? value : key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
