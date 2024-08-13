import Logger from "./logger";
import i18next from 'i18next';
import { LocalizationMap, Locale } from 'discord.js';
import FsBackend, { FsBackendOptions } from 'i18next-fs-backend';
const { join } = require('path');

const fs = require('fs');

let languages: Locale[] = [Locale.French, Locale.EnglishUS];

const defaultLocale = 'en-US';

export async function initI18N() {
    Logger.info("Loading languages...");

    i18next.use(FsBackend).init<FsBackendOptions>({
        initImmediate: false,
        debug: true,
        lng: 'en-US',
        fallbackLng: 'en-US',
        preload: languages,
        ns: ['translation'],
        defaultNS: 'translation',
        backend: {
            loadPath: join(__dirname, '../../data/i18n/{{lng}}/{{ns}}.json'),
        },
    }, (err, t) => {
        if (err) console.error(err);
        console.log('i18next is ready...');
    });
    Logger.info("Languages loaded!");

    /* const translationFiles = fs.readdirSync('./data/i18n');

    for (const i in translationFiles) {
        const content = fs.readFileSync(`./data/i18n/${translationFiles[i]}`, 'utf8');
        const translation = JSON.parse(content);
        localization[translation.LANGUAGE] = { translation };
        languages.push(translation.LANGUAGE);
        await i18next.addResources(translation.LANGUAGE, 'translation', translation);
        Logger.info(`Loaded ${translation.LANGUAGE}`);
    }
    i18next.reloadResources();
    console.log();*/
}

export function __(key: string, locale: string, data: { [key: string]: any } = {}): string {
    return i18next.t(key, {
        lng: locale,
        ...data,
    });
}

export function getMappedTranslation(key: string): LocalizationMap {
    let translations: LocalizationMap = {};
    languages.forEach((language: Locale) => {
        translations[language] = i18next.t(key, {
            lng: language,
            fallbackLng: defaultLocale,
            defaultValue: key
        });
    });
    return translations;
}