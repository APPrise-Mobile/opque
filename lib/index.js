import _ from 'lodash';
import { validateOptions, validateOperation, validateDocument } from './validate-options';
import bunyan from 'bunyan';

export const CREATE = 'CREATE';
export const UPDATE = 'UPDATE';
export const DELETE = 'DELETE';

export class OpQue {

  constructor(opts) {
    validateOptions(opts);
    this.flushTime = opts.flushTime;
    this.flushCb = opts.flushCb;
    this.identifier = opts.identifier;
    this.queue = {};
    this._resetFlushInterval.bind(this);
    this.intervalId = setInterval(this.flush.bind(this), this.flushTime);

    let logLevel = opts.logLevel || 'error';
    this.log = bunyan.createLogger({
      name: 'opque',
      stream: process.stdout,
      level: logLevel
    });
  }

  queueOperation(operation, document, metaData) {
    validateOperation(operation);
    validateDocument(document, this.identifier);

    if(operation === CREATE) {
      this._queueCreate(document, metaData);
    } else if(operation === UPDATE) {
      this._queueUpdate(document, metaData);
    } else if(operation === DELETE) {
      this._queueDelete(document, metaData);
    }

    this._resetFlushInterval();
  }

  _queueCreate(doc, metaData) {
    //get the current operation
    let currentOperation = this.queue[doc[this.identifier]];

    //warn the user that a create came in for an existing doc
    if(_.isObject(currentOperation)) {
      this.log.warn({currentOperation: currentOperation}, 'OpQue recieved a create for a document that was already in the queue');
    }

    //set the new operation on the queue
    let operation = {
      operation: CREATE,
      doc: doc
    };
    this.log.debug({operation: operation}, 'queueing operation');
    this._queueDoc(operation, metaData);
  }

  _queueUpdate(doc, metaData) {
    let currentOperation = this.queue[doc[this.identifier]];

    if(_.isObject(currentOperation)) {
      if(currentOperation.operation === DELETE) {
        //warn the user that something weird is going on
        this.log.warn({
          currentOperation: currentOperation,
          updateDoc: doc
        }, 'OpQueue received an update for a document that is queued to be deleted');
      } else {
        let mergeResult = _.merge(currentOperation.doc, doc);
        this.log.debug({
          oldDoc: currentOperation.doc,
          newDoc: doc,
          mergeResult: mergeResult
        }, 'merging documents because of an update');
        this.queue[doc[this.identifier]].doc = mergeResult;
      }
    } else {
      let operation = {
        operation: UPDATE,
        doc: doc
      };
      this.log.debug({operation: operation}, 'queuing operation');
      this._queueDoc(operation, metaData);
    }
  }

  _queueDelete(doc, metaData) {
    let currentOperation = this.queue[doc[this.identifier]];

    if(_.isObject(currentOperation) && currentOperation.operation === CREATE) {
      this.log.debug({currentOperation: currentOperation}, 'omitting create from queue because of delete');
      this.queue = _.omit(doc[this.identifier]);
    } else {
      let operation = {
        operation: DELETE,
        doc: doc
      };
      this.log.debug({operation: operation}, 'queuing operation');
      this._queueDoc(operation, metaData);
    }
  }

  _queueDoc(operation, metaData) {
    let id = operation.doc[this.identifier];
    if(!_.isUndefined(metaData)) {
      operation.metaData = metaData;
    }
    this.queue[id] = operation;
  }

  flush() {
    if(!_.isEmpty(this.queue)) {
      this.log.debug({queue: this.queue}, 'flushing the queue');
      const queueClone = _.clone(this.queue);
      this.queue = {};
      return this.flushCb(queueClone);
    }
  }

  _resetFlushInterval() {
    clearInterval(this.intervalId);
    this.intervalId = setInterval(this.flush.bind(this), this.flushTime);
  }
}
