function loader(source) {
  console.log('logger1-loader');
  return source + '// logger1-loader';
}

module.exports = loader;
