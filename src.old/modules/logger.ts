import CatLoggr from 'cat-loggr/ts';

export default class Logger {
    private static logger: CatLoggr;

    public static log(message?: any, ...optionalParams: any[]) {
        if (!this.logger) {
            this.logger = new CatLoggr(); 
        }
        this.logger.log(message, ...optionalParams);
    }

    public static info(message?: any, ...optionalParams: any[]) {
        if (!this.logger) {
            this.logger = new CatLoggr(); 
        }
        this.logger.info(message, ...optionalParams);
    }

    public static warn(message?: any, ...optionalParams: any[]) {
        if (!this.logger) {
            this.logger = new CatLoggr(); 
        }
        this.logger.warn(message, ...optionalParams);
    }

    public static error(message?: any, ...optionalParams: any[]) {
        if (!this.logger) {
            this.logger = new CatLoggr(); 
        }
        this.logger.error(message, ...optionalParams);
    }
}