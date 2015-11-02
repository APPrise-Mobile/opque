import should from 'should';
import sinon from 'sinon';
import _ from 'lodash';
import { OpQue, CREATE, UPDATE, DELETE } from './index';

let getOpque = function getOpque() {
  return new OpQue({
    flushTime: 1000,
    flushCb: function () {
    },
    identifier: '_id'
  })
};

describe('Operations Queue', function () {
  let sandbox, clock;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should throw an error if you initialize OpQue without an options object as a parameter', function () {
    (function () {
      new OpQue();
    }).should.throw('OpQue requires an options object as its only parameter');
  });

  it('should throw an error if you initialize OpQue without a flushTime', function () {
    (function () {
      new OpQue({});
    }).should.throw('OpQue requires a flushTime to be set in the options');
  });

  it('should throw an error if you initialize OpQue without a flush call back', function () {
    (function () {
      new OpQue({
        flushTime: 1000
      });
    }).should.throw('OpQue requires a flush call back to be set in the options');
  });

  it('should throw an error if you initialize opQue without an identifier', function () {
    (function () {
      new OpQue({
        flushTime: 1000,
        flushCb: function () {
          console.log('hello world');
        }
      });
    }).should.throw('OpQue requires an identifier to be set in the options');
  });

  it('should not throw any errors when all the options are passed in', function () {
    (function () {
      new OpQue({
        flushTime: 1000,
        flushCb: function () {
          console.log('hello world');
        },
        identifier: '_id'
      });
    }).should.not.throw();
  });

  it('should throw an error if you pass an illegal operation to queueOperation', function () {
    let opQ = getOpque();
    (function () {
      opQ.queueOperation('ILLEGAL', {_id: 200});
    }).should.throw('the operation you are trying to queue is not supported');
  });

  it('should throw an error if you pass an illegal document to queueOperation', function () {
    let opQ = getOpque();
    (function () {
      opQ.queueOperation(CREATE, {});
    }).should.throw('the document you are trying to queue does not have the identifier you specified');
  });

  it('should add the document to the queue as a create operation', function () {
    let opQ = getOpque();
    opQ.queueOperation(CREATE, {_id: 1, value: 'create me bruh'});
    let queue = opQ.queue;
    should.exist(queue[1]);
    queue[1].operation.should.equal('CREATE');
    queue[1].doc._id.should.equal(1);
    queue[1].doc.value.should.equal('create me bruh');
  });

  it('should add operation metaData on the the queue if present', function() {
    let opQ = getOpque();
    opQ.queueOperation(CREATE, {_id: 1, value: 'create me bruh'}, 'Content');
    let queue = opQ.queue;
    should.exist(queue[1]);
    queue[1].operation.should.equal('CREATE');
    queue[1].doc._id.should.equal(1);
    queue[1].doc.value.should.equal('create me bruh');
    queue[1].metaData.should.equal('Content');
  });

  it('should add the document to the queue as an update operation', function () {
    let opQ = getOpque();
    opQ.queueOperation(UPDATE, {_id: 1, value: 'update me bruh'});
    let queue = opQ.queue;
    should.exist(queue[1]);
    queue[1].operation.should.equal('UPDATE');
    queue[1].doc._id.should.equal(1);
    queue[1].doc.value.should.equal('update me bruh');
  });

  it('should add the document to the queue as a delete operation', function () {
    let opQ = getOpque();
    opQ.queueOperation(DELETE, {_id: 1, value: 'delete me bruh'});
    let queue = opQ.queue;
    should.exist(queue[1]);
    queue[1].operation.should.equal('DELETE');
    queue[1].doc._id.should.equal(1);
    queue[1].doc.value.should.equal('delete me bruh');
  });

  it('should clear out a create if a delete comes in', function () {
    let opQ = getOpque();
    opQ.queueOperation(CREATE, {_id: 1, value: 'create me bruh'});
    opQ.queueOperation(DELETE, {_id: 1, value: 'create me bruh'});
    let queue = opQ.queue;
    should.not.exist(queue[1]);
  });

  it('should replace and update if a delete comes in', function () {
    let opQ = getOpque();
    opQ.queueOperation(UPDATE, {_id: 1, value: 'create me bruh'});
    opQ.queueOperation(DELETE, {_id: 1, value: 'create me bruh'});
    let queue = opQ.queue;
    should.exist(queue[1]);
    queue[1].operation.should.equal('DELETE');
    queue[1].doc._id.should.equal(1);
    queue[1].doc.value.should.equal('create me bruh');
  });

  it('should call the flush callback with the proper queue', function () {
    let createDoc = {
      _id: 'createMe'
    };
    let updateDoc = {
      _id: 'updateMe'
    };
    let deleteDoc = {
      _id: 'deleteMe'
    };
    let flushCb = function(queue) {
      _.keys(queue).length.should.equal(3);

      queue.createMe.doc._id.should.equal('createMe');
      queue.createMe.operation.should.equal('CREATE');

      queue.updateMe.doc._id.should.equal('updateMe');
      queue.updateMe.operation.should.equal('UPDATE');

      queue.deleteMe.doc._id.should.equal('deleteMe');
      queue.deleteMe.operation.should.equal('DELETE');
    };

    let opQ = new OpQue({
      flushTime: 1000,
      flushCb: flushCb,
      identifier: '_id'
    });
    opQ.queueOperation(CREATE, createDoc);
    opQ.queueOperation(UPDATE, updateDoc);
    opQ.queueOperation(DELETE, deleteDoc);
    clock.tick(10000);
  });

  it('should not call the flush callback with an empty queue', function () {
    let flushCb = sandbox.stub();
    new OpQue({
      flushTime: 1000,
      flushCb: flushCb,
      identifier: '_id'
    });
    clock.tick(10000);
    flushCb.callCount.should.equal(0);
  });

  it('should only call the cb once because the interval should reset on each addition to the queue', function() {
    let flushCb = sandbox.stub();
    let opQ = new OpQue({
      flushTime: 1000,
      flushCb: flushCb,
      identifier: '_id'
    });
    clock.tick(800);
    opQ.queueOperation(CREATE, {_id: 1});
    clock.tick(800);
    opQ.queueOperation(CREATE, {_id: 2});
    clock.tick(800);
    opQ.queueOperation(CREATE, {_id: 3});
    clock.tick(800);
    opQ.queueOperation(CREATE, {_id: 4});
    clock.tick(800);
    opQ.queueOperation(CREATE, {_id: 5});
    clock.tick(1000);
    flushCb.callCount.should.equal(1);
  });

  it('should merge the create with the new update', function() {
    let flushCb = function(queue) {
      queue.docId.operation.should.equal('CREATE');
      queue.docId.doc._id.should.equal('docId');
      queue.docId.doc.accessGroups.length.should.equal(1);
      queue.docId.doc.accessGroups[0].should.equal(2);
      queue.docId.doc.title.should.equal('updated');
    };

    let opQ = new OpQue({
      flushTime: 1000,
      flushCb: flushCb,
      identifier: '_id'
    });

    opQ.queueOperation(CREATE, {
      _id: 'docId',
      accessGroups: [1],
      title: 'this should get overwritten'
    });
    opQ.queueOperation(UPDATE, {
      _id: 'docId',
      accessGroups: [2],
      title: 'updated'
    });
    clock.tick(1000);
  });
});
