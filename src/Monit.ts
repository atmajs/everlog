//import { Application } from 'atma-server'
import { MonitWorker, IMonitOptions } from './MonitWorker';
import { EmptyLoggerFile, LoggerFile } from './fs/LoggerFile';
import { ILogger, ILoggerOpts } from "./interfaces/ILogger";
import { ChannelReader } from './reader/ChannelReader';
import { Everlog } from './Everlog';
import alot from 'alot';

declare type Application = any;

export namespace Monit {
    let monit: MonitWorker;

    export async function startLogger (opts: IMonitOptions) {
        await Everlog.initialize(opts);
    }

    export function start (app: Application, opts: IMonitOptions) {
        monit = new MonitWorker(opts);
        monit.watchServer(app.lifecycle);
        monit.restoreChannelsAsync();

        let basicAuth = require('express-basic-auth');
        let base = 'file://' + __dirname.replace(/\\/g, '/').replace(/[^\/]+\/?$/, 'www/');

        let keys = ['monit.pss', 'server.monit.pss', 'everlog.pss', 'server.everlog.pss'];
        let pss = alot(keys)
            .map(key => app.config.$get(key))
            .first();

        let noPssFn = function (req, res, next) {
            next(new Error(`Password not set in 'everlog.pss' nor in 'server.everlog.pss'`));
        };
        let basicAuthFn = pss == null ? noPssFn : basicAuth({
            users: { [pss]: pss },
            challenge: true,
            realm: 'EverlogPss'
        });

        const { Application, StaticContent } = require('atma-server');

        let subApp = new Application({
            base,
            configs: null,
            config: {
                service: {
                    endpoints: base + 'endpoints/'
                }
            },
        });
        subApp.processor({
            before: [
                function (req, res, next) {
                    res.status = function (code) {
                        this.statusCode = code;
                        return this;
                    };
                    res.send = function (data) {
                        this.end(data);
                        return this;
                    };
                    res.set = function (key, val) {
                        this.setHeader(key, val);
                    }
                    next();
                },
                basicAuthFn
            ],
            after: [
                StaticContent.create()
            ]
        });
        subApp.lib = {
            monit
        };
        app.handlers.registerSubApp('atma/monit', subApp, null);
    }
    export function createChannel (name: string, opts?: Partial<ILoggerOpts>): ILogger {
        return monit?.createChannel(name, opts) ?? new EmptyLoggerFile(name, opts);
    }

    export function createChannelReader (channel: LoggerFile)
    export function createChannelReader (name: string, opts?: Partial<ILoggerOpts>)
    export function createChannelReader (mix: string | LoggerFile, opts?: Partial<ILoggerOpts>) {
        let channel: LoggerFile = null;
        if (typeof mix === 'string') {
            if (opts?.directory == null) {
                throw new Error(`Set the root directory to read the logs from`);
            }
            channel = LoggerFile.create(mix, {
                directory: null,
                ...opts
            });
        } else {
            channel = mix;
        }

        return new ChannelReader(channel);
    }
    export function flush () {
        monit?.flush();
    }
    export function error (error: Error ) {
        monit?.writeError(error);
    }
}

declare var global;
if (global.atma == null) {
    global.atma = {};
}
global.atma.Monit = Monit;
