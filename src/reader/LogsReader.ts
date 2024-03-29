import { MonitWorker } from '../MonitWorker';
import { ITableColumnFilter } from '../model/Table';
import { ChannelReader } from './ChannelReader';
import { DayDate } from '../model/DayDate';
import { Json, Rule } from 'class-json';

export class LogsReader {
    constructor (public monit: MonitWorker) {

    }

    getChannels () {
        return Object.keys(this.monit.loggers).map(key => {
            let channel = this.monit.loggers[key];
            return {
                name: key,
                directory: channel.directory,
                columns: channel.opts.fields
            };
        });
    }
    getChannelInfo (key: string) {
        let channel = this.monit.loggers[key];
        if (channel == null) {
            throw new Error(`Channel ${key} not found`);
        }
        return {
            name: key,
            directory: channel.directory,
            columns: channel.opts.fields
        };
    }
    getChannelStats (key: string) {
        let channel = this.monit.loggers[key];
        if (channel == null) {
            throw new Error(`Channel ${key} not found`);
        }
        let channelReader = new ChannelReader(channel);
        return channelReader.stats();
    }

    async getChannelDays (key: string) {
        let channel = this.monit.loggers[key];
        if (channel == null) {
            throw new Error(`Channel ${key} not found`);
        }
        let channelReader = new ChannelReader(channel);
        return channelReader.getDays();
    }
    async getChannelData (query: GetChannelParams) {

        let channel = this.monit.loggers[query.key];
        if (channel == null) {
            throw new Error(`Channel ${query.key} not found`);
        }
        let channelReader = new ChannelReader(channel);
        return channelReader.getData(query);
    }
}

export class GetChannelParams {

    @Rule.required()
    key: string

    @Json.type(Number)
    sortByColumnIdx?: number
    sortDir?: 'asc' | 'desc'

    columnFilters?: ITableColumnFilter[]

    @Json.type(DayDate)
    day?: DayDate

    @Json.type(Date)
    rangeStart?: Date

    @Json.type(Date)
    rangeEnd?: Date

    @Json.type(Number)
    offset?: number

    @Json.type(Number)
    limit?: number
};



