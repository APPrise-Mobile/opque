import _ from 'lodash';

export const validateOptions = function validateOptions(opts) {
  if(!_.isObject(opts)) {
    throw new Error('OpQue requires an options object as its only parameter');
  }
  if(!_.isString(opts.flushTime) && !_.isNumber(opts.flushTime)) {
    throw new Error('OpQue requires a flushTime to be set in the options');
  }
  if(!_.isFunction(opts.flushCb)) {
    throw new Error('OpQue requires a flush call back to be set in the options');
  }
  if(!_.isString(opts.identifier)) {
    throw new Error('OpQue requires an identifier to be set in the options');
  }
};

export const validateOperation = function validateOperation(operation) {
  if(operation !== 'CREATE' && operation !== 'UPDATE' && operation !== 'DELETE') {
    throw new Error('the operation you are trying to queue is not supported');
  }
};

export const validateDocument = function validateDocument(doc, identifier) {
  if(_.isUndefined(doc[identifier])) {
    throw new Error('the document you are trying to queue does not have the identifier you specified');
  }
};

export default validateOptions;
