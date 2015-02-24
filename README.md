# fs-dummy
`fs-dummy` is a node.js module which creates simple directory structures. It is intended to be used for testing.

Install
-------
    $ npm install fs-dummy

Run tests
---------
Go to the root directory of the `fs-dummy` module, make sure dependencies are installed and run the tests.

    $ cd node_modules/fs-dummy
    $ npm install
    $ npm test

Dummy class
-----------
The structure that is created by of each instance is the same. That is one root directory that contains one text file and one empty directory. It is planed to support nesting of the dummies.

### Dummy(root, file, content, folder)
Constructor for the `Dummy` class. Creates new object in memory only, local file system is not touched yet.

__Arguments__
* `root` - Path to a dummy root directory.

* `file` - Name of a file to be created in the dummy root directory.

* `content` - Text content of the file.

* `folder` - Name of a directory to be created in the dummy root directory.

### ensure(callback)
Creates the dummy on the file system.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error.

### ensureFile(callback)
Creates the dummy file on the file system. The dummy root directory must exist.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error.

### ensureFolder(callback)
Creates the dummy folder on the file system. The dummy root directory must exist.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error.

### cleanup(callback)
Removes the dummy from the file system.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error.

### cleanupFile(callback)
Removes the dummy file from the file system. The dummy root directory must exist.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error.

### cleanupFolder(callback)
Removes the dummy folder from the file system. The dummy root directory must exist.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error.

### verify(callback)
Checks the dummy's state on the file system is exactly the same as it should be. That is no new files or directories or other elements inside the dummy root directory or any subdirectories and the known files exist and remain unchanged.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error. If no error then state of the instance matches its state on file system and the verification was successfull.

### verifyFile(callback)
Checks the dummy's inner file state on the file system is exactly the same as it should be. That is the file exists under its name and its content remains unchanged.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error. If no error then state of the instance matches its state on file system and the verification was successfull.

### verifyFolder(callback)
Checks the dummy's inner folder state on the file system is exactly the same as it should be. That is the folder exists under its name and is empty.

__Arguments__
* `callback(err)` - Callback that is called only with a possible error. If no error then state of the instance matches its state on file system and the verification was successfull.
