/**
 * InputRegistry
 *
 * Central map of component strings (from widget configs) → React components.
 * The PropertyEditor uses this to resolve which component to render for each field.
 *
 * Adding a new input type = add it here once.
 * Adding a new widget type = add a config file only (no changes here).
 */
import TextInput from './TextInput';
import UrlInput from './UrlInput';
import ToggleInput from './ToggleInput';
import PillSelector from './PillSelector';
import NumberInput from './NumberInput';
import VersionInput from './VersionInput';
import ImageUpload from '../ImageUpload';
import ColorPicker from '../ColorPickerInput';
import SlugBuilder from './SlugBuilder';
import ProductListInput from './ProductListInput';
import SelectInput from './SelectInput';
import DateTimeInput from './DateTimeInput';
import DateRangePicker from './DateRangePicker';
import StateProductEditor from './StateProductEditor';
import ScrollItemEditor from '../Editors/ScrollItemEditor';
import CategoryItemEditor from '../Editors/CategoryItemEditor';
import CarouselItemEditor from '../Editors/CarouselItemEditor';

export const InputRegistry = {
    TextInput,
    UrlInput,
    ToggleInput,
    PillSelector,
    NumberInput,
    VersionInput,
    ImageUpload,
    ColorPicker,
    SlugBuilder,
    ProductListInput,
    SelectInput,
    DateTimeInput,
    DateRangePicker,
    StateProductEditor,
    ScrollItemEditor,
    CategoryItemEditor,
    CarouselItemEditor,
};

/**
 * Get a component from the registry, with fallback to TextInput.
 * @param {string} componentName - Name from the field config
 * @returns {React.Component}
 */
export function getInputComponent(componentName) {
    const component = InputRegistry[componentName];
    if (!component) {
        console.warn(`[InputRegistry] Unknown component: ${componentName}, falling back to TextInput`);
        return InputRegistry.TextInput;
    }
    return component;
}
