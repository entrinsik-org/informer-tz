'use strict';

const moment = require('moment');
const _ = require('lodash');
const es = require('ent-streams');

const converter = function (type, value) {
    if(!value) return null;
    return moment(value).add(moment(value).utcOffset(), 'minutes');
};

exports.register = function (server, opts, next) {

    const dataTypes = server.dm('dataType');

    dataTypes.intercept({
        convert: (type, value, next) => {
            if(type === 'date_tz'){
                if(_.isArray(value)){
                    return _.map(value, v => converter(type, v));
                }
                return converter(type, value);
            }
            return next();
        }
    });

    //apply this conversion to the columns directly after query
    server.app.ext('datasource.beforeQuery', (d, q) => {
        //TODO Uncomment after pr'ing tz feature in i5
        // if(_.some(d.features, (f) => f.featureId === 'tz')) {
            const dateFields = _.reduce(q.payload.fields, (accu, v) => v.dataType === 'date_tz' ? accu.concat(v.fieldId) : accu, []);
            q.through(es.eachSync(r => {
                _.forEach(dateFields, f => {
                    r[f] = dataTypes.convert('date_tz', r[f], () => r[f]);
                });
                return r;
            }));
        // }
    });
    next();

};

exports.register.attributes = { name : 'informer-tz' };