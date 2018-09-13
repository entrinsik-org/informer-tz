'use strict';

const moment = require('moment');
const _ = require('lodash');
const es = require('ent-streams');

const converter = function (type, value) {
    if (!value) return null;
    return moment(value).add(moment(value).utcOffset(), 'minutes').toDate();
};

const convert = (type, value) => {
    if (type === 'date_tz') {
        if (_.isArray(value)) {
            return _.map(value, v => converter(type, v));
        }
        return converter(type, value);
    }
    return value;
};

exports.register = function (server, opts, next) {
    if(!opts.disabled) {
        //apply this conversion to the columns directly after query
        server.app.ext('datasource.beforeQuery', (d, q) => {
            //TODO Add check for timezone feature on datasource
            const dateFields = _.filter(q.payload.fields, { dataType: 'date_tz' });
            q.through(es.eachSync(r => {
                _.forEach(dateFields, f => {
                    r[f.fieldId] = convert('date_tz', r[f.fieldId]);
                });
                return r;
            }));
        });
    }
    next();
};

exports.register.attributes = { name: 'informer-tz' };