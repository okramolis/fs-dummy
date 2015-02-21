var assert      = require('chai').assert
  , expect      = require('chai').expect
  , Dummy       = require('../lib/fs-dummy').Dummy
  , DummyError  = require('../lib/fs-dummy').DummyError
  , async       = require('async')
  , path        = require('path')
  , fs          = require('fs-extra')
  , os          = require('os')
  , dirio       = require('dirio')
;

const TEST_DIR        = '__dummy__' + getRandStr()
  ,   TEST_ROOT_PATH  = path.join(os.tmpdir(), TEST_DIR)
  ,   TEST_INDIR      = 'dummy_dir'
  ,   TEST_FILE       = 'dummy.txt'
  ,   TEST_CONTENT    = 'dummy content ...'
;

before(function() {
  console.log('  using %s as a dummy root directory\n', TEST_ROOT_PATH);
});

after(function(done) {
  console.log('  cleaning up ...\n');
  manualCleanup(done);
});

describe.only('Dummy', function() {

  after(manualCleanup);

  var dummy = new Dummy(TEST_ROOT_PATH, TEST_FILE, TEST_CONTENT, TEST_INDIR);

  describe('._createRoot()', function() {

    before(manualCleanup);

    after(manualCleanup);

    it('should create directory in current directory', function(done) {
      dummy._createRoot(function(err) {
        expect(err).to.not.exist;
        fs.stat(TEST_ROOT_PATH, function(err, stats) {
          if (err && err.code !== 'ENOENT') return done(err);
          assert.isNull(err, 'not created');
          assert.isTrue(stats.isDirectory(), 'not a directory');
          done();
        });
      });
    });

  });

  describe('._createFolder()', function() {

    before(manualInitDummyRoot);

    after(manualCleanup);

    it('should create directory in dummy root directory', function(done) {
      dummy._createFolder(function(err) {
        expect(err).to.not.exist;
        fs.stat(path.join(TEST_ROOT_PATH, TEST_INDIR), function(err, stats) {
          if (err && err.code !== 'ENOENT') return done(err);
          assert.isNull(err, 'not created');
          assert.isTrue(stats.isDirectory(), 'not a directory');
          done();
        });
      });
    });

  });

  describe('._createFile()', function() {

    before(manualInitDummyRoot);

    after(manualCleanup);

    it('should create file in dummy root directory', function(done) {
      dummy._createFile(function(err) {
        expect(err).to.not.exist;
        fs.readFile(
          path.join(TEST_ROOT_PATH, TEST_FILE),
          { encoding: 'utf8' },
          function(err, data) {
            if (err && err.code !== 'ENOENT') return done(err);
            assert.isNull(err, 'not created');
            assert.strictEqual(data, TEST_CONTENT, 'content does not match');
            done();
          }
        );
      });
    });

  });

  describe('._verifyRootStat()', function() {

    describe('when there is nothing at path of dummy root directory', function() {

      before(manualCleanup);

      it('should fail with ENOENT error', function(done) {
        dummy._verifyRootStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('ENOENT');
          done();
        });
      });

    });

    describe('when there is not a directory at an existing path of dummy root ' +
             'directory but a file', function() {

      before(function(done) {
        async.series([
          manualCleanup,
          fs.writeFile.bind(null, TEST_ROOT_PATH, 'file at a dummy dir path')
        ], done);
      });

      it('should fail with STAT_ENOTDIR error', function(done) {
        dummy._verifyRootStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('STAT_ENOTDIR');
          done();
        });
      });

    });

    describe('when there is not a directory at an existing path of dummy root ' +
             'directory but a symbolic link to directory', function() {

      before(function(done) {
        async.series([
          manualCleanup,
          fs.symlink.bind(null, './', TEST_ROOT_PATH)
        ], done);
      });

      it('should fail with STAT_ENOTDIR error', function(done) {
        dummy._verifyRootStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('STAT_ENOTDIR');
          done();
        });
      });

    });

    describe('when there is a directory at an existing path of dummy root directory', function() {

      before(function(done) {
        async.series([
          manualCleanup,
          fs.mkdir.bind(null, TEST_ROOT_PATH)
        ], done);
      });

      it('should pass with no error', function(done) {
        dummy._verifyRootStat(function(err) {
          expect(err).to.not.exist;
          done();
        });
      });

    });

  });

  describe('._verifyRootChildren()', function() {

    before(manualInitDummyRoot);

    after(manualCleanup);

    describe('when dummy root directory is empty', function() {

      before(manualInitDummyRoot);

      it('should fail with MANDATORY_MISSING error', function(done) {
        dummy._verifyRootChildren(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('MANDATORY_MISSING');
          done();
        });
      });

    });

    describe('when there are only unknown file and directory in dummy root directory', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, getRandStr()), getRandStr()),
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, getRandStr()))
        ], done);
      });

      it('should fail with UNKNOWN_DETECTED or MANDATORY_MISSING error', function(done) {
        dummy._verifyRootChildren(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          assert.isTrue(err.code === 'UNKNOWN_DETECTED' || err.code === 'MANDATORY_MISSING',
                        'error [' + err + '] matches neither UNKNOWN_DETECTED nor MANDATORY_MISSING');
          done();
        });
      });

    });

    describe('when path of dummy file exists in dummy root directory ' +
             'but path of dummy folder does not', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, TEST_FILE), getRandStr())
        ], done);
      });

      it('should fail with MANDATORY_MISSING error', function(done) {
        dummy._verifyRootChildren(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('MANDATORY_MISSING');
          done();
        });
      });

    });

    describe('when path of dummy folder exists in dummy root directory ' +
             'but path of dummy file does not ', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, TEST_INDIR))
        ], done);
      });

      it('should fail with MANDATORY_MISSING error', function(done) {
        dummy._verifyRootChildren(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('MANDATORY_MISSING');
          done();
        });
      });

    });

    describe('when paths of both dummy folder and dummy file exist in dummy root directory ' +
             'but there does exist also an unknown file', function() {

      before(function(done) {
        async.series([
          manualInitDummy,
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, getRandStr()), '')
        ], done);
      });

      it('should fail with UNKNOWN_DETECTED error', function(done) {
        dummy._verifyRootChildren(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('UNKNOWN_DETECTED');
          done();
        });
      });

    });

    describe('when paths of both dummy folder and dummy file exist in dummy root directory ' +
             'but there does exist also an unknown directory', function() {

      before(function(done) {
        async.series([
          manualInitDummy,
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, getRandStr()))
        ], done);
      });

      it('should fail with UNKNOWN_DETECTED error', function(done) {
        dummy._verifyRootChildren(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('UNKNOWN_DETECTED');
          done();
        });
      });

    });

    describe('when only paths of both dummy file and dummy folder exist ' +
             'in dummy root directory', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, TEST_INDIR)),
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, TEST_FILE), getRandStr())
        ], done);
      });

      it('should pass with no error', function(done) {
        dummy._verifyRootChildren(function(err) {
          expect(err).to.not.exist;
          done();
        });
      });

    });

  });

  describe('._verifyFileStat()', function() {

    describe('when there is nothing at path of dummy file', function() {

      before(manualInitDummyRoot);

      it('should fail with ENOENT error', function(done) {
        dummy._verifyFileStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('ENOENT');
          done();
        });
      });

    });

    describe('when there is not a file at an existing path of dummy file ' +
             'but a directory', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, TEST_FILE))
        ], done);
      });

      it('should fail with STAT_ENOTFILE error', function(done) {
        dummy._verifyFileStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('STAT_ENOTFILE');
          done();
        });
      });

    });

    describe('when there is not a file at an existing path of ' +
             'dummy file but a symbolic link to a file', function() {

      const tmpFile = path.join(os.tmpdir(), getRandStr());

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.writeFile.bind(null, tmpFile, getRandStr()),
          fs.symlink.bind(null, tmpFile, path.join(TEST_ROOT_PATH, TEST_FILE))
        ], done);
      });

      after(function(done) {
        fs.unlink(tmpFile, done);
      });

      it('should fail with STAT_ENOTFILE error', function(done) {
        dummy._verifyFileStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('STAT_ENOTFILE');
          done();
        });
      });

    });

    describe('when there is a file at an existing path of dummy file', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, TEST_FILE), getRandStr())
        ], done);
      });

      it('should pass with no error', function(done) {
        dummy._verifyFileStat(function(err) {
          expect(err).to.not.exist;
          done();
        });
      });

    });

  });

  describe('._verifyFileContent()', function() {

    describe('when there is a file with not matching content at path of dummy file', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, TEST_FILE), getRandStr() + TEST_CONTENT)
        ], done);
      });

      it('should fail with NOMATCH_CONTENT error', function(done) {
        dummy._verifyFileContent(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('NOMATCH_CONTENT');
          done();
        });
      });

    });

    describe('when there is a file with matching content at path of dummy file', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, TEST_FILE), TEST_CONTENT)
        ], done);
      });

      it('should pass with no error', function(done) {
        dummy._verifyFileContent(function(err) {
          expect(err).to.not.exist;
          done();
        });
      });

    });

  });

  describe('._verifyFolderStat()', function() {

    describe('when there is nothing at path of dummy folder', function() {

      before(manualInitDummyRoot);

      it('should fail with ENOENT error', function(done) {
        dummy._verifyFolderStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('ENOENT');
          done();
        });
      });

    });

    describe('when there is not a directory at an existing path of ' +
             'dummy folder but a file', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.writeFile.bind(null, path.join(TEST_ROOT_PATH, TEST_INDIR), getRandStr())
        ], done);
      });

      it('should fail with STAT_ENOTDIR error', function(done) {
        dummy._verifyFolderStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('STAT_ENOTDIR');
          done();
        });
      });

    });

    describe('when there is not a directory at an existing path of dummy folder ' +
             'but a symbolic link to directory', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.symlink.bind(null, './', path.join(TEST_ROOT_PATH, TEST_INDIR))
        ], done);
      });

      it('should fail with STAT_ENOTDIR error', function(done) {
        dummy._verifyFolderStat(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('STAT_ENOTDIR');
          done();
        });
      });

    });

    describe('when there is a directory at an existing path of dummy folder', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, TEST_INDIR))
        ], done);
      });

      it('should pass with no error', function(done) {
        dummy._verifyFolderStat(function(err) {
          expect(err).to.not.exist;
          done();
        });
      });

    });

  });

  describe('._verifyFolderChildren()', function() {

    describe('when dummy folder is not empty', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.ensureFile.bind(null, path.join(TEST_ROOT_PATH, TEST_INDIR, getRandStr()))
        ], done);
      });

      it('should fail with UNKNOWN_DETECTED error', function(done) {
        dummy._verifyFolderChildren(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('UNKNOWN_DETECTED');
          done();
        });
      });

    });

    describe('when dummy folder is empty', function() {

      before(function(done) {
        async.series([
          manualInitDummyRoot,
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, TEST_INDIR))
        ], done);
      });

      it('should pass with no error', function(done) {
        dummy._verifyFolderChildren(function(err) {
          expect(err).to.not.exist;
          done();
        });
      });

    });

  });

  describe('.cleanup()', function() {

    before(manualInitDummy);

    it('should remove all created files/directories', function(done) {
      dummy.cleanup(function(err) {
        expect(err).to.not.exist;
        fs.exists(TEST_ROOT_PATH, function(exists) {
          assert.isFalse(exists, 'some files/directories still exist');
          done();
        });
      });
    });

  });

  describe('.ensure()', function() {

    function assertDummyEnsure(done, err, o) {
      if (err) return done(err);

      expect(o).to.have.property('name', TEST_DIR);

      expect(o).to.have.property('type', dirio.TYPE_FOLDER);

      expect(o).to.have.property('children')
      .that.have.deep.members([{
        name: TEST_FILE,
        type: dirio.TYPE_FILE,
        data: TEST_CONTENT
      },{
        name: TEST_INDIR,
        type: dirio.TYPE_FOLDER,
        children: []
      }]);

      done();
    }

    describe('when there is no entity with the same name as dummy ' +
             'root directory in current directory', function() {

      before(manualCleanup);

      it('should ensure the dummy exists in current directory with strictly ' +
         'matching content', function(done) {

        dummy.ensure(function(err) {
          expect(err).to.not.exist;
          dirio.lconvert(TEST_ROOT_PATH, assertDummyEnsure.bind(null, done));
        });
      });

    });

    describe('when there is an empty dummy root directory in current directory', function() {

      before(manualInitDummyRoot);

      it('should ensure the dummy exists in current directory with strictly ' +
         'matching content', function(done) {

        dummy.ensure(function(err) {
          expect(err).to.not.exist;
          dirio.lconvert(TEST_ROOT_PATH, assertDummyEnsure.bind(null, done));
        });
      });

    });

    describe('when there is a dummy root directory in current directory ' +
             'with not matching content', function() {

      before(function(done) {
        var randPath = path.join(TEST_ROOT_PATH, getRandStr());
        async.series([
          manualInitDummyRoot,
          fs.mkdir.bind(null,  randPath + '_dir'),
          fs.writeFile.bind(null,  randPath + '_file', getRandStr()),
          fs.symlink.bind(null,  randPath + '_dir',  randPath + '_symlink')
        ], done);
      });

      it('should ensure the dummy exists in current directory with strictly ' +
         'matching content', function(done) {

        dummy.ensure(function(err) {
          expect(err).to.not.exist;
          dirio.lconvert(TEST_ROOT_PATH, assertDummyEnsure.bind(null, done));
        });
      });

    });

  });

  describe('.verify()', function() {

    describe('when the dummy does not exist', function() {

      before(manualCleanup);

      it('should fail with ENOENT error', function(done) {

        dummy.verify(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.equal('ENOENT');
          done();
        });

      });

    });

    describe('when the dummy exists but its content does not match', function() {

      before(function(done) {
        async.series([
          manualInitDummy,
          fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, 'empty_dir')),
          fs.outputFile.bind(null, path.join(
            TEST_ROOT_PATH, '1', '2', '3', '4', '5', '6', '7', '8', TEST_FILE
          ), TEST_CONTENT),
          fs.symlink.bind(null, TEST_FILE, path.join(
            TEST_ROOT_PATH, TEST_FILE + '.txt'
          ))
        ], done);
      });

      it('should fail with ENOENT or UNKNOWN_DETECTED or MANDATORY_MISSING or ' +
         'NOMATCH_CONTENT or STAT_ENOTDIR or STAT_ENOTFILE error', function(done) {

        dummy.verify(function(err) {
          expect(err).to.be.instanceOf(DummyError);
          expect(err.code).to.match(
            /^(ENOENT|UNKNOWN_DETECTED|MANDATORY_MISSING|NOMATCH_CONTENT|STAT_ENOTDIR|STAT_ENOTFILE)$/
          );
          done();
        });

      });

    });

    describe('when the dummy does exist and its content does match', function() {

      before(manualInitDummy);

      it('should pass with no error', function(done) {

        dummy.verify(function(err) {
          expect(err).to.not.exist;
          done();
        });

      });

    });

  });

});

function manualInitDummyRoot(callback) {
  async.series([
    manualCleanup,
    fs.mkdir.bind(null, TEST_ROOT_PATH)
  ], callback);
}

function manualInitDummy(callback) {
  async.series([
    manualCleanup,
    fs.outputFile.bind(null, path.join(TEST_ROOT_PATH, TEST_FILE), TEST_CONTENT),
    fs.mkdir.bind(null, path.join(TEST_ROOT_PATH, TEST_INDIR))
  ], callback);
}

function manualCleanup(callback) {
  fs.remove(TEST_ROOT_PATH, callback);
}

function getRandStr() {
  return String(Math.random()).slice(2);
}