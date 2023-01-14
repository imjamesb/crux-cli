export default (import.meta.url.match(/(?<=@)[^\/]+/g) || [])[0] ||
  "unversioned";
