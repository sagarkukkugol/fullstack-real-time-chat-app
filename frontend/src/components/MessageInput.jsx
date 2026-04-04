import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Paperclip } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileName, setFileName] = useState("");

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const { sendMessage } = useChatStore();

  // ✅ IMAGE HANDLER
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ✅ FILE HANDLER (PDF, DOC, etc.)
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // ✅ allow ALL files (pdf, excel, doc, etc.)
  if (file.size > 20 * 1024 * 1024) {
    toast.error("File too large (max 20MB)");
    return;
  }

  console.log("FILE SIZE:", file.size);
  console.log("FILE TYPE:", file.type);

  const reader = new FileReader();

  reader.onloadend = () => {
    const base64 = reader.result;

    if (!base64 || base64.length < 50) {
      toast.error("File conversion failed");
      return;
    }

    setFilePreview(base64);
    setFileName(file.name);
  };

  reader.readAsDataURL(file);
};

  // ✅ REMOVE IMAGE
  const removeImage = () => {
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // ✅ REMOVE FILE
  const removeFile = () => {
    setFilePreview(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ✅ SEND MESSAGE
const handleSendMessage = async (e) => {
  e.preventDefault();

  if (!text.trim() && !imagePreview && !filePreview) return;

  try {
    await sendMessage({
      text: text.trim(),
      image: imagePreview,
      file: filePreview,
      fileName: fileName,
    });

    setText("");
    setImagePreview(null);
    setFilePreview(null);
    setFileName("");

  } catch (error) {
    console.log("FRONT ERROR:", error);
    toast.error("Failed to send message");
  }
};

  return (
    <div className="p-4 w-full">

      {/* ✅ PREVIEW SECTION */}
      {(imagePreview || filePreview) && (
        <div className="mb-3 flex gap-3">

          {/* IMAGE PREVIEW */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="preview"
                className="w-20 h-20 rounded-lg object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1 -right-1 bg-base-300 rounded-full p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* FILE PREVIEW */}
          {filePreview && (
            <div className="relative bg-base-200 p-3 rounded-lg">
              📎 {fileName}
              <button
                onClick={removeFile}
                className="absolute -top-1 -right-1 bg-base-300 rounded-full p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ INPUT FORM */}
      <form onSubmit={handleSendMessage} className="flex gap-2">

        <input
          type="text"
          placeholder="Type a message..."
          className="input input-bordered w-full"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* IMAGE INPUT */}
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          className="hidden"
          onChange={handleImageChange}
        />

        {/* FILE INPUT */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* BUTTONS */}
        <button
          type="button"
          onClick={() => imageInputRef.current.click()}
          className="btn btn-circle"
        >
          <Image size={18} />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="btn btn-circle"
        >
          <Paperclip size={18} />
        </button>

        <button type="submit" className="btn btn-circle">
          <Send size={18} />
        </button>

      </form>
    </div>
  );
};

export default MessageInput;