const FALLBACK_IMAGE = '/images/jewelry-placeholder.svg';
import { getMediaUrl } from './mediaUrl';

export const ProductImage = ({ src, alt, ...props }) => {
  return (
    <img
      {...props}
      src={getMediaUrl(src)}
      alt={alt || 'Jewellery piece'}
      onError={(event) => {
        if (event.currentTarget.src.endsWith(FALLBACK_IMAGE)) {
          event.currentTarget.hidden = true;
        } else {
          event.currentTarget.src = FALLBACK_IMAGE;
        }
      }}
    />
  );
};
