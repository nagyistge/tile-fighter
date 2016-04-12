/// <reference path='./references.d.ts' />

import * as PIXI from "pixi.js";

/**
 * Monkey-patch PIXI.js API
 **/
export const updatePixiAPI = () => {
  PIXI.DisplayObject.prototype.depth = 0;

  PIXI.Container.prototype.sortChildrenByDepth = function () {
    this.children.mergeSort(sortByDepth);
  };

  function sortByDepth(a: {depth: number}, b: {depth: number}) {
    let left = a.depth;
    let right = b.depth;
    if (left < right)
      return -1;
    if (left == right)
      return 0;
    else
      return 1;
  }
};

const p = Array.prototype as any;

p.mergeSort = mergeSort;

function mergeSort(compare: (a: number, b: number) => number) {
  const items = this;

  if (items.length < 2) {
    return items;
  }

  const middle = Math.floor(items.length / 2),
    left = items.slice(0, middle),
    right = items.slice(middle),
    params = merge(left.mergeSort(compare), right.mergeSort(compare), compare);

  // Add the arguments to replace everything between 0 and last item in the array
  params.unshift(0, items.length);
  items.splice.apply(items, params);
  return items;
}

function merge(left: number[], right: number[], compare: (a: number, b: number) => number) {
  const result: number[] = []
  let il = 0
  let ir = 0

  while (il < left.length && ir < right.length) {
    if (compare(left[il], right[ir]) < 0) {
      result.push(left[il++]);
    } else {
      result.push(right[ir++]);
    }
  }

  return result.concat(left.slice(il)).concat(right.slice(ir));
}