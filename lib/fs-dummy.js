// -------------------------------------------------------------------
// MODULE PUBLIC INTERFACE
// -------------------------------------------------------------------
module.exports = {
  Dummy     : Dummy,
  DummyError: DummyError
};

// -------------------------------------------------------------------
// MODULE DEPENDENCIES
// -------------------------------------------------------------------
var async   = require('async')
  , path    = require('path')
  , util    = require('util')
  , fs      = require('fs-extra')
  , VError  = require('verror').VError
;

// -------------------------------------------------------------------
// MODULE DEFINITION
// -------------------------------------------------------------------

// -------------------------------------------------------------------
// DummyError class
//
//   Simple class derived from Error. Used feor creating Dummy class
//   specific errors.
// -------------------------------------------------------------------

const DUMMY_ERRNOS = {
  DEFAULT           : 1,
  ENOENT            : 2,
  UNKNOWN_DETECTED  : 3,
  MANDATORY_MISSING : 4,
  NOMATCH_CONTENT   : 5,
  STAT_ENOTDIR      : 6,
  STAT_ENOTFILE     : 7
};

// TODO parent's to string method not used properly like in case of simple Error class
function DummyError() {
  var code = arguments[0]
    , args = Array.prototype.slice.call(arguments, 1)
    , msgi = (typeof args[0] === 'object') ? 1 : 0
  ;
  // Apply code to error message composed by parent class.
  args[msgi] = code + ', ' + args[msgi];
  // Construct parent.
  VError.apply(this, args);
  // Define DummyError specific attributes.
  this.name = 'DummyError';
  this.code = code || 'DEFAULT';
  this.errno = DUMMY_ERRNOS[this.code];
}
util.inherits(DummyError, VError);

// -------------------------------------------------------------------
// Dummy class
//
//   Creates simple file structure used mainly for testing.
// -------------------------------------------------------------------
// TODO use asserts for input args
// TODO allow empty content of file, needs to be explicitly specified using content === ''
function Dummy(root, file, content, folder) {
  if (
    !root    || typeof root    !== 'string' ||
    !file    || typeof file    !== 'string' ||
    !content || typeof content !== 'string' ||
    !folder  || typeof folder  !== 'string'
  ) {
    throw new Error('Dummy constructor needs four not empty strings.');
  }
  Object.defineProperties(this, {
    _root     : { value: root    },
    _file     : { value: file    },
    _content  : { value: content },
    _folder   : { value: folder  },
    _nChildren: { value: 2       }  // number of direct root children
  });
}

// -------------------------------------------------------------------
// Public methods
// -------------------------------------------------------------------

Dummy.prototype.ensure = function(callback) {
  // Cleanup at first, then initilalize the content.
  async.series([
    this.cleanup.bind(this),
    this._createRoot.bind(this),
    this._createFile.bind(this),
    this._createFolder.bind(this)
  ], callback);
}

Dummy.prototype.cleanup = function(callback) {
  // Make sure the root test directory does not exist.
  fs.remove(this._root, callback);
}

Dummy.prototype.verify = function(callback) {
  // Make sure everything is exactly the same as it was after initialization
  // including possibly new items inside the dummy directories.
  async.series([
    this._verifyRootStat.bind(this),
    this._verifyRootChildren.bind(this),
    this._verifyFolderStat.bind(this),
    this._verifyFolderChildren.bind(this),
    this._verifyFileStat.bind(this),
    this._verifyFileContent.bind(this)
  ], callback);
}

Dummy.prototype.verifyFile = function(callback) {
  // Make sure the file is exactly the same as it was after
  // initialization. Verify its name and content.
  async.series([
    this._verifyFileStat.bind(this),
    this._verifyFileContent.bind(this)
  ], callback);
}

Dummy.prototype.verifyFolder = function(callback) {
  // Make sure the folder is exactly the same as it was after
  // initialization. Verify its name and children.
  async.series([
    this._verifyFolderStat.bind(this),
    this._verifyFolderChildren.bind(this),
  ], callback);
}

// -------------------------------------------------------------------
// Private methods
// -------------------------------------------------------------------

// Creates root test directory.
Dummy.prototype._createRoot = function(callback) {
  fs.mkdir(this._root, callback);
}

// Creates text file in the root test directory.
Dummy.prototype._createFile = function(callback) {
  fs.writeFile(path.join(this._root, this._file), this._content, callback);
}

// Creates directory in the root test directory.
Dummy.prototype._createFolder = function(callback) {
  fs.mkdir(path.join(this._root, this._folder), callback);
}

// Makes sure that the root directory exists.
Dummy.prototype._verifyRootStat = function(callback) {
  const entity = 'dummy root directory';
  fs.lstat(this._root, this._handleVerifyFs.bind(this, entity, function(stats) {
    return((stats.isDirectory())
      ? null
      : new DummyError('STAT_ENOTDIR', '%s %s is not a directory.', entity, this._root)
    );
  }, callback));
}

// Makes sure paths of the file and the folder are the only children of the root.
Dummy.prototype._verifyRootChildren = function(callback) {
  const entity = 'dummy root directory';
  fs.readdir(this._root, this._handleVerifyFs.bind(this, entity, function(files) {
    if (files.indexOf(this._folder) === -1) {
      // Inner directory not found.
      return new DummyError(
        'MANDATORY_MISSING',
        'dummy folder %s not found in dommy root directory %s',
         this._folder,
         this._root
      );
    }
    if (files.indexOf(this._file) === -1) {
      // File not found.
      return new DummyError(
        'MANDATORY_MISSING',
        'dummy file %s not found in dummy root directory %s',
        this._file,
        this._root
      );
    }
    if (files.length > this._nChildren) {
      // There is something that should not be there.
      return new DummyError(
        'UNKNOWN_DETECTED',
        'at least one unknown child of dummy root directory %s detected among its children %s',
        this._root,
        JSON.stringify(files)
      );
    }
    // Everything ok.
    return null;
  }, callback));
}

// Makes sure that the file exists inside the root directory.
Dummy.prototype._verifyFileStat = function(callback) {
  const entity = 'dummy file';
  var fPath = path.join(this._root, this._file);
  fs.lstat(fPath, this._handleVerifyFs.bind(this, entity, function(stats) {
    return((stats.isFile())
      ? null
      : new DummyError('STAT_ENOTFILE', '%s %s is not a file.', entity, fPath)
    );
  }, callback));
}

// Makes sure that the content of the file matches.
Dummy.prototype._verifyFileContent = function(callback) {
  const entity = 'dummy file';
  var fPath = path.join(this._root, this._file);
  fs.readFile(
    fPath,
    { encoding: 'utf8' },
    this._handleVerifyFs.bind(this, entity, function(data) {
      return ((data === this._content)
        ? null
        : new DummyError('NOMATCH_CONTENT', 'Content "%s" of %s does not match ' +
                         'with expected dummy content "%s"', data, entity, this._content)
      );
    }, callback)
  );
}

// Makes sure that the folder exists inside the root directory.
Dummy.prototype._verifyFolderStat = function(callback) {
  const entity = 'dummy folder';
  var fPath = path.join(this._root, this._folder);
  fs.lstat(fPath, this._handleVerifyFs.bind(this, entity, function(stats) {
    return((stats.isDirectory())
      ? null
      : new DummyError('STAT_ENOTDIR', '%s %s is not a directory.', entity, fPath)
    );
  }, callback));
}

// Makes sure that the folder is empty.
Dummy.prototype._verifyFolderChildren = function(callback) {
  const entity = 'dummy folder';
  var fPath = path.join(this._root, this._folder);
  fs.readdir(fPath, this._handleVerifyFs.bind(this, entity, function(files) {
    if (files.length !== 0) {
      // There is something that should not be there.
      return new DummyError('UNKNOWN_DETECTED', '%s %s is not empty.', entity, fPath);
    }
    // Everything ok.
    return null;
  }, callback));
}

// Low level utility. Simplifies chaining of results of fs methods to app's validation logic.
Dummy.prototype._handleVerifyFs = function(entity, validator, callback, err, result) {
  if (err) {
    // Unexpected error occurred.
    if (err.code !== 'ENOENT') return callback(err);
    // Dummy item does not exist, but it should.
    return callback(new DummyError('ENOENT', err, '%s does not exist', entity));
  }
  // No error, validate data and continue.
  callback(validator.call(this, result));
}

