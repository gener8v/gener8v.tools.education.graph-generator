# Data Graphs & Pictographs Specification

## Overview

Defines the three graph types that present data sets rather than geometry: line graphs, bar graphs and pictographs (picture bar graphs built from repeated unit images). It sets out the type-specific parameters each type carries in the unified description, the checks those parameters receive, and how each type must be drawn so that what a student sees is faithful to the numbers. Shared mechanics — the unified description, vocabulary, validation results, derived values and presentation options — are defined in Graph Specification & Vocabulary and are referenced here, not restated.

## Source Context

**Parent PRD:** Curricular Graph Generator
**Requirement prefix:** DGP
**Status:** Approved
**Approved by:** Product Owner — Thomas, 2026-10-04
**Related Capabilities:** Graph Specification & Vocabulary (the unified description, vocabulary, validation and presentation mechanics these types use — GSV-REQ-001..045); Number Lines & Coordinate Graphs (shares axis and tick conventions); Component Packaging & Source Export (renders and exports these types, publishes the image set)

## Functional Requirements

### Shared Data-Graph Parameters

- **DGP-REQ-001** *(must · change: graph-library)*: The system should accept, for line graphs, bar graphs and pictographs, an ordered list of categories, each with a plain-text name
- **DGP-REQ-002** *(must · change: graph-library)*: The system should accept a category-axis label and a value-axis label on line graphs and bar graphs, and a value-unit label (for example, "students") on pictographs
- **DGP-REQ-003** *(must · change: graph-library)*: The system should draw categories in the order they are given in the description
- **DGP-REQ-004** *(must · change: graph-library)*: The system should produce a plain-text alternative for every line graph, bar graph and pictograph that states the graph type, title, axis or unit labels, and every category with its value

### Value Scale

- **DGP-REQ-005** *(must · change: graph-library)*: The system should accept an optional value-scale minimum, maximum and tick interval on line graphs and bar graphs
- **DGP-REQ-006** *(must · change: graph-library)*: The system should choose a value scale that starts at zero and includes every data value when no scale is given
- **DGP-REQ-007** *(must · change: graph-library)*: The system should report a given value scale that does not include every data value
- **DGP-REQ-008** *(must · change: graph-library)*: The system should report a tick interval that is not positive or that does not divide the scale range into a whole number of intervals
- **DGP-REQ-009** *(must · change: graph-library)*: The system should label every tick on the value axis with its value

### Line Graphs

- **DGP-REQ-010** *(must · change: graph-library)*: The system should render a line graph from one or more series, each series giving one value per category
- **DGP-REQ-011** *(must · change: graph-library)*: The system should accept a label and a line color on each series
- **DGP-REQ-012** *(must · change: graph-library)*: The system should mark each data value on a line graph with a point and join consecutive points of one series with straight line segments
- **DGP-REQ-013** *(must · change: graph-library)*: The system should show a legend naming every series when a line graph has more than one series
- **DGP-REQ-014** *(must · change: graph-library)*: The system should give each series a distinct default color from the default style when no line color is given
- **DGP-REQ-015** *(must · change: graph-library)*: The system should accept negative values in a line-graph series, extending the default value scale below zero to include them
- **DGP-REQ-016** *(must · change: graph-library)*: The system should report a series whose number of values differs from the number of categories

### Bar Graphs

- **DGP-REQ-017** *(must · change: graph-library)*: The system should render a bar graph with one bar per category, each bar's length set by that category's value
- **DGP-REQ-018** *(must · change: graph-library)*: The system should accept a bar orientation of vertical or horizontal, defaulting to vertical
- **DGP-REQ-019** *(must · change: graph-library)*: The system should accept a bar color for the whole graph and an optional color on an individual category
- **DGP-REQ-020** *(must · change: graph-library)*: The system should accept an option to show each bar's value as a label on or beside the bar
- **DGP-REQ-021** *(must · change: graph-library)*: The system should report a negative bar value
- **DGP-REQ-022** *(must · change: graph-library)*: The system should draw a bar with value zero as no bar, keeping its category position and label

### Pictographs

- **DGP-REQ-023** *(must · change: graph-library)*: The system should render a pictograph with one row (or column) per category, each built from repeated copies of one unit image
- **DGP-REQ-024** *(must · change: graph-library)*: The system should accept a unit image by name from the published image set
- **DGP-REQ-025** *(must · change: graph-library)*: The system should accept a unit value: the number of units one image represents
- **DGP-REQ-026** *(must · change: graph-library)*: The system should draw, for each category, a number of images equal to the category's value divided by the unit value
- **DGP-REQ-027** *(must · change: graph-library)*: The system should show a key stating what one image represents, in the form "each [image name] = [unit value] [value-unit label]"
- **DGP-REQ-028** *(must · change: graph-library)*: The system should draw a value that is not a whole multiple of the unit value as whole images followed by one partial image cropped to the remaining fraction
- **DGP-REQ-029** *(must · change: graph-library)*: The system should report a unit value that is not positive
- **DGP-REQ-030** *(must · change: graph-library)*: The system should report a negative pictograph value
- **DGP-REQ-031** *(must · change: graph-library)*: The system should report a unit image name that is not in the published image set and list the available names
- **DGP-REQ-032** *(must · change: graph-library)*: The system should accept a pictograph orientation of horizontal rows or vertical columns, defaulting to horizontal rows

### Image Set

- **DGP-REQ-033** *(must · change: graph-library)*: The system should publish an image set in which each image has a unique name and a plain-English description
- **DGP-REQ-034** *(must · change: graph-library)*: The system should include in the published image set only images licensed for redistribution under terms compatible with the package's open-source license
- **DGP-REQ-035** *(must · change: graph-library)*: The system should list the published image names in the vocabulary and the published schema, so that a caller can choose a valid image without reading the package's source

### Faithful Drawing

- **DGP-REQ-036** *(must · change: graph-library)*: The system should draw bar lengths and line-graph point positions in exact proportion to their values on the value scale
- **DGP-REQ-037** *(must · change: graph-library)*: The system should draw every pictograph image at the same size and spacing, so that equal values produce equal-length rows

## Non-Functional Requirements

- **DGP-NFR-001** *(must · change: graph-library)*: Every drawn bar length and line-graph point position is within 0.5 px of its exact proportional position at the graph's rendered size — **verified by:** a geometry test that renders the example and generated descriptions of each type and compares element coordinates with values computed from the data
- **DGP-NFR-002** *(must · change: graph-library)*: The visible width of a partial pictograph image is within 2% of the exact remaining fraction of one image — **verified by:** a geometry test over generated non-whole-multiple values
- **DGP-NFR-003** *(must · change: graph-library)*: The text alternative of every rendered data graph names every category and value in the description — **verified by:** a test that renders generated descriptions and checks each category name and value appears in the text alternative
- **DGP-NFR-004** *(must · change: graph-library)*: The default colors assigned to the first six series of a line graph are pairwise distinguishable in greyscale (a luminance difference of at least 15%) — **verified by:** an automated luminance check over the default series palette in CI
- **DGP-NFR-005** *(must · change: graph-library)*: Every image in the published set has a recorded license compatible with the package license — **verified by:** a CI check that fails when an image file has no license entry in the image-set manifest

## Behaviors & Rules

### Scale and Layout

- When a value scale is given, the system should use it exactly and never extend it
- When no scale is given and all values are zero, the system should use a scale from 0 to 1
- When a bar value label is shown, the system should show the value as supplied, without rounding
- When a category name is too long for its slot, the system should keep the whole name readable (wrapping or rotating it) rather than truncate it

### Pictograph Units

- When a value is a whole multiple of the unit value, the system should draw only whole images
- When a category's value is zero, the system should draw no images and keep the category's row and name
- When the remaining fraction is very small (less than 1% of one image), the system should still draw the partial image rather than drop it, so that no value is silently understated
- The key should use the value-unit label when one is given, and the plain word "units" when none is given

### Shared Mechanics

- Validation, issue reporting, defaults and presentation options follow Graph Specification & Vocabulary (GSV-REQ-016..034, GSV-REQ-040..045)
- Line color and line label are the shared presentation options (GSV-REQ-040); on a line graph they apply per series

## Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| No categories | The system should report that at least one category is required |
| Line graph with no series | The system should report that at least one series is required |
| Series with an empty value list | The system should report a length mismatch against the categories |
| Two categories with the same name | The system should report the duplicate category name |
| Line-graph series with only one category | The system should draw the single point with no connecting segment |
| Very many categories (for example, 50) | The system should draw them all; legibility is the caller's choice |
| Pictograph value that would need hundreds of images | The system should draw them; an Open Question asks whether to cap the count |
| Non-integer data values on a bar graph (for example, 2.5) | The system should accept them and draw them proportionally |
| Value scale minimum above zero on a bar graph | The system should report it, since bars must start at zero to be faithful |
| Category color given on a pictograph | The system should report it as an option that does not apply |
| Image name with different letter case from the published name | The system should report it as unknown and suggest the published name |

## Data Requirements

- The description of each type should carry: categories; for line graphs, series of values with optional labels and colors; for bar graphs, one value per category, orientation, bar color and per-category colors, and the show-values option; for pictographs, one value per category, the unit image name, the unit value, the value-unit label and orientation
- The system should hold the published image set: each image's name, description, artwork and license
- These type-specific terms enter the single definition from which the vocabulary, schema and validation rules are generated (GSV-REQ-015)

## User Interactions

- A curriculum developer should be able to produce any of the three types from categories and values alone, relying on defaults for scale, colors and orientation
- A caller should be able to discover the available pictograph images from the published vocabulary or schema

## Open Questions

- [ ] **OQ-001**: Is the pictograph image set supplied by the package, by the consuming developer, or both? This specification assumes a package-published set; consumer-supplied images would need a way to name and validate them (Carried from PRD)
- [ ] **OQ-002**: Which images are in the first published set, and where do they come from (commissioned, public-domain)?
- [ ] **OQ-003**: Is a cropped partial image the right way to show non-whole multiples, or should curricula that teach "half a symbol" be offered a rounding-to-halves option? (Carried from PRD)
- [ ] **OQ-004**: Should a pictograph cap the number of images it draws, and what should happen above the cap?
- [ ] **OQ-005**: Are grouped or stacked bar graphs (several values per category) needed, or only one value per category?
- [ ] **OQ-006**: Should line graphs support a numeric (continuous) category axis such as years at uneven spacing, or only evenly spaced categories?
- [ ] **OQ-007**: Should bar graphs allow negative values (bars below a zero line)? This specification rejects them

## Assumptions

- Assumption: Categories are evenly spaced along the category axis
- Assumption: A pictograph uses one unit image for all categories
- Assumption: Values are drawn as supplied; the system does not round or aggregate data
- Assumption: The published image set ships with the package and needs no network access at runtime

## @spec Coverage

| Requirement | Code Location(s) |
|-------------|-----------------|
| DGP-REQ-001 | `src/core/definitions/categories.ts`:categoriesProperty, checkCategories; `src/layout/kit/value-scale.ts`:categorySlots, drawCategoryNames |
| DGP-REQ-002 | `src/core/definitions/categories.ts`:dataGraphProperties; `src/core/definitions/shared.ts`:sharedProperties (category- and value-axis labels); `src/core/definitions/index.ts`:propertiesOf |
| DGP-REQ-003 | `src/core/definitions/categories.ts`:categoriesProperty; `src/layout/kit/value-scale.ts`:categorySlots, drawCategoryNames |
| DGP-REQ-005 | `src/core/definitions/categories.ts`:dataGraphProperties; `src/core/value-scale.ts`:resolveValueScale; `src/core/definitions/index.ts`:propertiesOf |
| DGP-REQ-006 | `src/core/value-scale.ts`:resolveValueScale; `src/layout/kit/value-scale.ts`:defaultValueScale |
| DGP-REQ-007 | `src/core/value-scale.ts`:checkValueScale |
| DGP-REQ-008 | `src/core/value-scale.ts`:checkValueScale, checkTickInterval |
| DGP-REQ-009 | `src/core/value-scale.ts`:valueTicks; `src/layout/kit/value-scale.ts`:drawValueAxis |
| DGP-REQ-033 | `src/images/types.ts`:ImageAsset; `src/images/{apple,ball,book,fish,flower,person,star,tree}.ts`; `src/images/manifest.ts`:imageAssets; `src/images/index.ts`:images, imageDescriptions |
| DGP-REQ-034 | `src/images/types.ts`:ALLOWED_IMAGE_LICENSES, ImageAsset; `src/images/manifest.ts`:imageAssets, imageManifest; `scripts/check-image-licenses.ts`:checkImageLicenses |
| DGP-REQ-035 | `src/images/index.ts`:getImageNames, imageDescriptions |
| DGP-NFR-005 | `src/images/manifest.ts`:imageManifest; `scripts/check-image-licenses.ts`:checkImageLicenses |
