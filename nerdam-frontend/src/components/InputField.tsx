import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Textarea,
} from "@chakra-ui/react";
import { useField } from "formik";
import React, { InputHTMLAttributes } from "react";

// make InputField component accept any props a regular Input Field would accept
type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  textarea?: boolean;
};

export const InputField: React.FC<InputFieldProps> = ({
  label,
  textarea,
  size: _,
  ...props
}) => {
  let InputOrTextarea = Input;
  if (textarea) {
    InputOrTextarea = Textarea;
  }
  const [field, { error }] = useField(props);

  return (
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <InputOrTextarea {...field} {...props} id={field.name} />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
};

// import {
//   ComponentWithAs,
//   FormControl,
//   FormErrorMessage,
//   FormLabel,
//   Input,
//   InputProps,
//   Textarea,
//   TextareaProps,
// } from "@chakra-ui/react";
// import { useField } from "formik";
// import React, { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// // make InputField component accept any props a regular Input Field would accept
// type InputFieldProps = (
//   | InputHTMLAttributes<HTMLInputElement>
//   | TextareaHTMLAttributes<HTMLTextAreaElement>
// ) & {
//   name: string;
//   label: string;
//   textarea?: boolean;
// };

// export const InputField: React.FC<InputFieldProps> = ({
//   label,
//   textarea,
//   size: _size,
//   ...props
// }) => {
//   let InputOrTextarea:
//     | ComponentWithAs<"input", InputProps>
//     | ComponentWithAs<"textarea", TextareaProps> = Input;

//   if (textarea) {
//     InputOrTextarea = Textarea;
//   }
//   const [field, { error }] = useField(props);

//   return (
//     <FormControl isInvalid={!!error}>
//       <FormLabel htmlFor={field.name}>{label}</FormLabel>
//       <InputOrTextarea {...field} {...props} id={field.name} />
//       {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
//     </FormControl>
//   );
// };
