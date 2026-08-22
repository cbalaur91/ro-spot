import { render } from '@testing-library/react-native';

import { Bird } from '../Bird';

type Rendered = Awaited<ReturnType<typeof render>>;

/** The `Svg` the motif draws into, as the renderer sees it. */
function drawnBox(tree: Rendered) {
  const svg = tree.toJSON();
  if (!svg || Array.isArray(svg)) throw new Error('The bird drew nothing.');
  return svg.props as { width: number; height: number };
}

describe('Bird', () => {
  it('keeps the grid’s own proportions at whatever width it is given', async () => {
    // The pasăre is 16×12 cells. A bird stretched to a box is a bird with a
    // broken wing, so the caller says how wide and the height follows.
    const box = drawnBox(await render(<Bird width={96} />));

    expect(box).toMatchObject({ width: 96, height: 72 });
  });

  it('faces the other way when asked', async () => {
    const right = await render(<Bird width={96} />);
    const left = await render(<Bird width={96} facing="left" />);

    expect(JSON.stringify(left.toJSON())).not.toEqual(JSON.stringify(right.toJSON()));
  });
});
