/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hugeicons 统一封装：全站唯一图标库，API 接近 lucide-react。
 */

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import { MatrixLoader } from '@/src/components/common/MatrixLoader';
import {
  Search01Icon,
  Add01Icon,
  MessageSquareCodeIcon,
  Link01Icon,
  Delete01Icon,
  Tick02Icon,
  Cancel01Icon,
  AlertCircleIcon,
  CpuIcon,
  BookOpen01Icon,
  UserCheck01Icon,
  SentIcon,
  HelpCircleIcon,
  ArrowRight01Icon,
  CloudUploadIcon,
  CheckmarkCircle01Icon,
  PlayIcon,
  UndoIcon,
  SparklesIcon,
  ZapIcon,
  LayerIcon,
  File01Icon,
  ArrowDown01Icon,
  Message01Icon,
  HeadphonesIcon,
  Settings02Icon,
  ChartHistogramIcon,
  Download01Icon,
  SmileIcon,
  UserGroupIcon,
  Shield01Icon,
  LaptopIcon,
  PanelLeftCloseIcon,
  Notification01Icon,
  ArrowUp01Icon,
  GiftIcon,
  UserIcon,
  Logout01Icon,
  Calendar01Icon,
  Upload01Icon,
  FileUploadIcon,
  Key01Icon,
  ContactBookIcon,
  SaveIcon,
  SecurityCheckIcon,
  CircleIcon,
  Refresh01Icon,
  SplitIcon,
  PauseIcon,
  SlidersHorizontalIcon,
  ArrowUpRight01Icon,
  ToggleOffIcon,
  ToggleOnIcon,
  Clock01Icon,
  CornerDownLeftIcon,
  ArrowLeft01Icon,
  Wifi01Icon,
  PowerIcon,
  Globe02Icon,
  Settings01Icon,
  Edit02Icon,
  Home01Icon,
  Folder01Icon,
  InformationCircleIcon,
  Mail01Icon,
  StarIcon,
  Robot01Icon,
  JusticeScale01Icon,
  Idea01Icon,
  Image01Icon,
  GridIcon,
  Layout01Icon,
  LayoutGridIcon,
  PackageIcon,
  PaintBoardIcon,
  ShoppingCart01Icon,
  LinkSquare02Icon,
  Copy01Icon,
  ViewIcon,
  ViewOffIcon,
  FilterIcon,
  Maximize01Icon,
  Minimize01Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  Location01Icon,
  MagicWand01Icon,
  CropIcon,
  TextIcon,
  LockIcon,
  SquareUnlock01Icon,
  Share01Icon,
  Activity01Icon,
  Compass01Icon,
  Database01Icon,
  SourceCodeIcon,
  ComputerTerminal01Icon,
  Award01Icon,
  TradeUpIcon,
  HistoryIcon as HugeHistoryIcon,
  AiBrain01Icon,
  WorkflowSquare01Icon,
  Eraser01Icon,
  FrameIcon,
  HandIcon,
  FavouriteIcon,
  HexagonIcon,
  LibraryIcon,
  ComputerIcon,
  MusicNote01Icon,
  AttachmentIcon,
  PentagonIcon,
  Redo02Icon,
  Undo02Icon,
  Shirt01Icon,
  SquareIcon,
  TriangleIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  Video01Icon,
  UnavailableIcon,
  MinusSignIcon,
  ArrowExpand01Icon,
  ServerStack01Icon,
  GitBranchIcon,
  LeftToRightListBulletIcon,
  FolderTreeIcon,
  PlayCircleIcon,
  AddCircleIcon,
  ShieldEnergyIcon,
  CheckmarkSquare01Icon,
  Alert02Icon,
  CornerDownRightIcon,
  FileCodeIcon,
  ImageNotFound01Icon,
  ImageAdd01Icon,
  ImageCropIcon,
  Cursor01Icon,
  ArrowDownRight01Icon,
  RotateLeft01Icon,
  Building03Icon,
  GraduationCapIcon,
  HierarchySquare01Icon,
  ClipboardCheckIcon,
} from '@hugeicons/core-free-icons';

export { HugeiconsIcon };
export type { IconSvgElement };

export type IconProps = {
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  fill?: string;
  color?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<SVGSVGElement>;
};

export type IconComponent = React.FC<IconProps>;
/** 兼容旧 lucide 类型名 */
export type LucideIcon = IconComponent;

function wrap(icon: IconSvgElement, options?: { spin?: boolean }): IconComponent {
  return function Icon({
    size = 16,
    strokeWidth = 2,
    className = '',
    fill,
    color,
    style,
    onClick,
    ...rest
  }: IconProps) {
    const numericSize = typeof size === 'string' ? Number.parseInt(size, 10) || 16 : size;

    return (
      <HugeiconsIcon
        icon={icon}
        size={numericSize}
        strokeWidth={strokeWidth}
        primaryColor={fill || color}
        className={`${options?.spin ? 'animate-spin' : ''} ${className}`.trim()}
        style={style}
        onClick={onClick}
        {...rest}
      />
    );
  };
}

export const Search = wrap(Search01Icon);
export const Plus = wrap(Add01Icon);
export const MessageSquareCode = wrap(MessageSquareCodeIcon);
export const Link2 = wrap(Link01Icon);
export const Trash2 = wrap(Delete01Icon);
export const Check = wrap(Tick02Icon);
export const X = wrap(Cancel01Icon);
export const AlertCircle = wrap(AlertCircleIcon);
export const Cpu = wrap(CpuIcon);
export const BookOpen = wrap(BookOpen01Icon);
export const UserCheck = wrap(UserCheck01Icon);
export const Send = wrap(SentIcon);
export const HelpCircle = wrap(HelpCircleIcon);
export const ArrowRight = wrap(ArrowRight01Icon);
export const UploadCloud = wrap(CloudUploadIcon);
export const CheckCircle2 = wrap(CheckmarkCircle01Icon);
export const CheckCircle = wrap(CheckmarkCircle01Icon);
export const Play = wrap(PlayIcon);
export const RotateCcw = wrap(UndoIcon);
export const Sparkles = wrap(SparklesIcon);
export const Zap = wrap(ZapIcon);
export const Layers = wrap(LayerIcon);
export const Layers2 = wrap(LayerIcon);
export const FileText = wrap(File01Icon);
export const ChevronDown = wrap(ArrowDown01Icon);
export const MessageSquare = wrap(Message01Icon);
export const Headphones = wrap(HeadphonesIcon);
export const Settings2 = wrap(Settings02Icon);
export const BarChart3 = wrap(ChartHistogramIcon);
export const BarChart2 = wrap(ChartHistogramIcon);
export const Download = wrap(Download01Icon);
export const Smile = wrap(SmileIcon);
export const ChevronRight = wrap(ArrowRight01Icon);
export const ChevronLeft = wrap(ArrowLeft01Icon);
export const Users = wrap(UserGroupIcon);
export const Shield = wrap(Shield01Icon);
export const Laptop = wrap(LaptopIcon);
export const PanelLeftClose = wrap(PanelLeftCloseIcon);
export const Bell = wrap(Notification01Icon);
export const ChevronUp = wrap(ArrowUp01Icon);
export const Gift = wrap(GiftIcon);
export const User = wrap(UserIcon);
export const LogOut = wrap(Logout01Icon);
export const Calendar = wrap(Calendar01Icon);
export const Upload = wrap(Upload01Icon);
export const FileUp = wrap(FileUploadIcon);
export const KeyRound = wrap(Key01Icon);
export const Contact = wrap(ContactBookIcon);
export const Save = wrap(SaveIcon);
export const ShieldCheck = wrap(SecurityCheckIcon);
export const Circle = wrap(CircleIcon);
/** 全站加载态：点阵动画（matrix-loader），兼容原 Loader2 调用方式 */
export const Loader2: IconComponent = ({ size = 16, className = '', style }) => (
  <MatrixLoader size={size} className={className} style={style} />
);
export const RefreshCw = wrap(Refresh01Icon);
export const Split = wrap(SplitIcon);
export const Pause = wrap(PauseIcon);
export const Sliders = wrap(SlidersHorizontalIcon);
export const SlidersHorizontal = wrap(SlidersHorizontalIcon);
export const ArrowUpRight = wrap(ArrowUpRight01Icon);
export const ToggleLeft = wrap(ToggleOffIcon);
export const ToggleRight = wrap(ToggleOnIcon);
export const Clock = wrap(Clock01Icon);
export const CornerDownLeft = wrap(CornerDownLeftIcon);
export const ArrowLeft = wrap(ArrowLeft01Icon);
export const Wifi = wrap(Wifi01Icon);
export const Power = wrap(PowerIcon);
export const Globe2 = wrap(Globe02Icon);
export const Settings = wrap(Settings01Icon);
export const Pencil = wrap(Edit02Icon);
export const Edit3 = wrap(Edit02Icon);

export const Home = wrap(Home01Icon);
export const Folder = wrap(Folder01Icon);
export const Info = wrap(InformationCircleIcon);
export const Mail = wrap(Mail01Icon);
export const Star = wrap(StarIcon);
export const Bot = wrap(Robot01Icon);
export const Scale = wrap(JusticeScale01Icon);
export const Lightbulb = wrap(Idea01Icon);
export const Image = wrap(Image01Icon);
export const ImageIcon = wrap(Image01Icon);
export const Grid3X3 = wrap(GridIcon);
export const Layout = wrap(Layout01Icon);
export const LayoutGrid = wrap(LayoutGridIcon);
export const Box = wrap(PackageIcon);
export const Palette = wrap(PaintBoardIcon);
export const ShoppingCart = wrap(ShoppingCart01Icon);
export const ExternalLink = wrap(LinkSquare02Icon);
export const Copy = wrap(Copy01Icon);
export const CopyIcon = wrap(Copy01Icon);
export const Eye = wrap(ViewIcon);
export const EyeOff = wrap(ViewOffIcon);
export const Filter = wrap(FilterIcon);
export const Maximize2 = wrap(Maximize01Icon);
export const Minimize2 = wrap(Minimize01Icon);
export const MoreHorizontal = wrap(MoreHorizontalIcon);
export const MoreVertical = wrap(MoreVerticalIcon);
export const MapPin = wrap(Location01Icon);
export const Wand2 = wrap(MagicWand01Icon);
export const Crop = wrap(CropIcon);
export const Type = wrap(TextIcon);
export const TypeIcon = wrap(TextIcon);
export const Lock = wrap(LockIcon);
export const Unlock = wrap(SquareUnlock01Icon);
export const Share2 = wrap(Share01Icon);
export const Activity = wrap(Activity01Icon);
export const Compass = wrap(Compass01Icon);
export const Database = wrap(Database01Icon);
export const Code = wrap(SourceCodeIcon);
export const Code2 = wrap(SourceCodeIcon);
export const Terminal = wrap(ComputerTerminal01Icon);
export const Award = wrap(Award01Icon);
export const TrendingUp = wrap(TradeUpIcon);
export const History = wrap(HugeHistoryIcon);
export const HistoryIcon = History;
export const BrainCircuit = wrap(AiBrain01Icon);
export const Workflow = wrap(WorkflowSquare01Icon);
export const Eraser = wrap(Eraser01Icon);
export const Frame = wrap(FrameIcon);
export const Hand = wrap(HandIcon);
export const Heart = wrap(FavouriteIcon);
export const Hexagon = wrap(HexagonIcon);
export const Library = wrap(LibraryIcon);
export const Monitor = wrap(ComputerIcon);
export const Music = wrap(MusicNote01Icon);
export const Paperclip = wrap(AttachmentIcon);
export const Pentagon = wrap(PentagonIcon);
export const Redo2 = wrap(Redo02Icon);
export const Undo2 = wrap(Undo02Icon);
export const Shirt = wrap(Shirt01Icon);
export const Square = wrap(SquareIcon);
export const Triangle = wrap(TriangleIcon);
export const ThumbsUp = wrap(ThumbsUpIcon);
export const ThumbsDown = wrap(ThumbsDownIcon);
export const Video = wrap(Video01Icon);
export const Ban = wrap(UnavailableIcon);
export const Minus = wrap(MinusSignIcon);
export const Expand = wrap(ArrowExpand01Icon);
export const Server = wrap(ServerStack01Icon);
export const GitBranch = wrap(GitBranchIcon);
export const ListTree = wrap(LeftToRightListBulletIcon);
export const FolderTree = wrap(FolderTreeIcon);
export const PlayCircle = wrap(PlayCircleIcon);
export const PlusCircle = wrap(AddCircleIcon);
export const ShieldAlert = wrap(ShieldEnergyIcon);
export const CheckSquare = wrap(CheckmarkSquare01Icon);
export const AlertTriangle = wrap(Alert02Icon);
export const AlertOctagon = wrap(AlertCircleIcon);
export const CornerDownRight = wrap(CornerDownRightIcon);
export const FileCode = wrap(FileCodeIcon);
export const ImageOff = wrap(ImageNotFound01Icon);
export const ImagePlus = wrap(ImageAdd01Icon);
export const ImageUpscale = wrap(ImageCropIcon);
export const MousePointer2 = wrap(Cursor01Icon);
export const ArrowUp = wrap(ArrowUp01Icon);
export const ArrowDownRight = wrap(ArrowDownRight01Icon);
export const MessageIcon = wrap(Message01Icon);
export const RotateLeft = wrap(RotateLeft01Icon);
export const Building = wrap(Building03Icon);
export const GraduationCap = wrap(GraduationCapIcon);
export const Hierarchy = wrap(HierarchySquare01Icon);
export const ClipboardCheck = wrap(ClipboardCheckIcon);

/** shadcn ui 别名 */
export const XIcon = X;
export const ChevronDownIcon = ChevronDown;
export const CheckIcon = Check;
export const ChevronUpIcon = ChevronUp;
