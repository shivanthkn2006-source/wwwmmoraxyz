/**
 * 3D name tags/labels (drei <Html>) each run their own React root. When a whole
 * world unmounts at once (portal trip Real Map → M'Mora World) the label's host
 * div is detached before React removes its child, and React throws
 * "removeChild: not a child of this node", which crashed VR World ("Module offline").
 * Ignoring a removal of an already-detached node is the React team's suggested
 * workaround (facebook/react#11538); every other removal behaves normally.
 */
if (typeof Node !== 'undefined' && !(Node.prototype as { __mmoraGuard?: boolean }).__mmoraGuard) {
  const orig = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return orig.call(this, child) as T;
  };
  (Node.prototype as { __mmoraGuard?: boolean }).__mmoraGuard = true;
}
export {};
