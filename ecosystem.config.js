module.exports = [{
  script: './index.js',
  error_file: 'err.log',
  out_file: 'out.log',
  log_file: 'combined.log',
  time: true,
  node_args: "--expose-gc --max-old-space-size=8192",
  max_memory_restart: '6000M'
}];
