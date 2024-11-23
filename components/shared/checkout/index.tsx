"use client";
import { useEffect, useState } from "react";
import { MapPin, Ticket, CreditCard, CheckCircle, Loader } from "lucide-react";
import { useForm } from "@mantine/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { applyCoupon, saveAddress } from "@/lib/database/actions/user.actions";

import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { FaArrowAltCircleRight } from "react-icons/fa";
import { createOrder } from "@/lib/database/actions/order.actions";
import { getSavedCartForUser } from "@/lib/database/actions/cart.actions";

export default function CheckoutComponent() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>();
  const [address, setAddress] = useState<any>();
  const [coupon, setCoupon] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [couponError, setCouponError] = useState("");
  const [totalAfterDiscount, setTotalAfterDiscount] = useState("");
  const [discount, setDiscount] = useState(0);
  const [data, setData] = useState<any>([]);
  const form = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      state: "",
      city: "",
      zipCode: "",
      address1: "",
      address2: "",
      country: "",
    },
    validate: {
      firstName: (value) =>
        value.trim().length < 6
          ? "First name must be at least 6 letters"
          : null,
      lastName: (value) =>
        value.trim().length < 2 ? "Last name must be at least 2 letters" : null,
      phoneNumber: (value) =>
        value.trim().length < 10 && value.trim().length > 10
          ? "Phone Number must be within 10 numbers"
          : null,
      state: (value) =>
        value.length < 2 ? "State must be at least 2 letters" : null,
      city: (value) =>
        value.length < 2 ? "City must be at least 2 letters" : null,
      zipCode: (value) =>
        value.length < 6 ? "Zip Code must be at least 6 characters." : null,
      address1: (value) =>
        value.length > 100 ? "Address 1 must not exceed 100 characters." : null,
      address2: (value) =>
        value.length > 100 ? "Address 2 must not exceed 100 characters." : null,
    },
  });

  const { userId } = useAuth();
  useEffect(() => {
    if (userId) {
      getSavedCartForUser(userId).then((res) => {
        setData(res?.cart);
        setUser(res?.user);
        setAddress(res?.address);
      });
    }
  }, [userId]);

  useEffect(() => {
    if (address && Object.keys(address).length > 0) {
      form.setValues({
        firstName: address.firstName || "",
        lastName: address.lastName || "",
        phoneNumber: address.phoneNumber || "",
        state: address.state || "",
        city: address.city || "",
        zipCode: address.zipCode || "",
        address1: address.address1 || "",
        address2: address.address2 || "",
        country: address.country || "",
      });
    }
  }, [address]);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);
  const router = useRouter();
  useEffect(() => {
    if (user?.address) {
      setAddress(user?.address);
    }
    setSubtotal(
      cart.reduce((a: any, c: any) => a + c.price * c.qty, 0).toFixed(2)
    );
  }, [user?.address]);
  const isStepCompleted = (currentStep: number) => step > currentStep;
  const isActiveStep = (currentStep: number) => step === currentStep;
  const applyCouponHandler = async (e: any) => {
    e.preventDefault();
    setCouponLoading(true);
    await applyCoupon(coupon, user._id)
      .catch((err) => {
        setCouponLoading(false);
        setCouponError(err);
      })
      .then((res) => {
        if (res.success) {
          setCouponLoading(false);

          setTotalAfterDiscount(res.totalAfterDiscount);
          setDiscount(res.discount);
          toast.success(`Applied ${res.discount}% on order successfuly.`);
          setCouponError("");
          nextStep();
        } else if (!res.success) {
          toast.error(`No Coupon Found`);
          setCouponLoading(false);
        }
      });
  };
  const cart = useCartStore((state: any) => state.cart.cartItems);
  const { emptyCart } = useCartStore();

  const totalSaved: number = cart.reduce((acc: any, curr: any) => {
    // Add the 'saved' property value to the accumulator
    return acc + curr.saved * curr.qty;
  }, 0);
  const [subTotal, setSubtotal] = useState<number>(0);
  const carttotal = subTotal + totalSaved;

  const [placeOrderLoading, setPlaceOrderLoading] = useState<boolean>(false);
  const isDisabled =
    paymentMethod === "" || user?.address.firstName === "" || placeOrderLoading;

  const buttonText = () => {
    if (paymentMethod === "") {
      return "Please select the payment method";
    } else if (paymentMethod === "cod") {
      return "Place Order with COD";
    } else if (user?.address.firstName === "") {
      return "Please Add Billing Address";
    } else if (paymentMethod === "razorpay") {
      return `Place Order with RazorPay`;
    }
  };

  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);
  const placeOrderHandler = async () => {
    try {
      setPlaceOrderLoading(true);
      if (paymentMethod == "") {
        toast.error("Please choose a payment method.");
        return;
      } else if (!user?.address.firstName) {
        toast.error("Please fill in all details in billing address.");
        setPlaceOrderLoading(false);
        return;
      }
      try {
        await createOrder(
          data?.products,
          user?.address,
          paymentMethod,
          totalAfterDiscount !== "" ? totalAfterDiscount : data?.cartTotal,
          data?.cartTotal,
          coupon,
          user._id,
          totalSaved
        )
          .then((res) => {
            if (res?.success) {
              emptyCart();
              router.replace(`/order/${res.orderId}`);
            } else {
              console.log("Order creation failed:", res?.message);
              toast.error(res?.message);
              // Handle the error case appropriately
            }
          })
          .catch((err) => toast.error(err));
      } catch (error) {
        console.error(error);
        // Handle errors here
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="container mx-auto p-4 md:p-8 ">
      <h1 className="text-2xl font-bold mb-6 text-center">CHECKOUT</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-2/3">
          {/* Stepper Tracker */}
          <div className="relative flex items-center justify-between mb-8">
            {/* Step 1 */}
            <div className="relative flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActiveStep(1)
                    ? "bg-primary text-white border-primary"
                    : isStepCompleted(1)
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-gray-200 text-gray-500 border-gray-300"
                }`}
              >
                {isStepCompleted(1) ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <MapPin className="w-5 h-5" />
                )}
              </div>
              <span
                className={`mt-2 text-sm ${
                  isActiveStep(1)
                    ? "text-primary font-semibold"
                    : isStepCompleted(1)
                    ? "text-green-500"
                    : "text-muted-foreground"
                }`}
              >
                <span className="hidden lg:block">Delivery Address</span>
              </span>
            </div>

            {/* Horizontal Line */}
            <div
              className={`flex-1 border-t-2 mx-4 ${
                step >= 2 ? "border-primary" : "border-gray-300"
              }`}
            ></div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActiveStep(2)
                    ? "bg-primary text-white border-primary"
                    : isStepCompleted(2)
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-gray-200 text-gray-500 border-gray-300"
                }`}
              >
                {isStepCompleted(2) ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Ticket className="w-5 h-5" />
                )}
              </div>
              <span
                className={`mt-2 text-sm ${
                  isActiveStep(2)
                    ? "text-primary font-semibold"
                    : isStepCompleted(2)
                    ? "text-green-500"
                    : "text-muted-foreground"
                }`}
              >
                <span className="hidden lg:block">Apply Coupon</span>
              </span>
            </div>

            {/* Horizontal Line */}
            <div
              className={`flex-1 border-t-2 mx-4 ${
                step >= 3 ? "border-primary" : "border-gray-300"
              }`}
            ></div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActiveStep(3)
                    ? "bg-primary text-white border-primary"
                    : isStepCompleted(3)
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-gray-200 text-gray-500 border-gray-300"
                }`}
              >
                {isStepCompleted(3) ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
              </div>
              <span
                className={`mt-2 text-sm ${
                  isActiveStep(3)
                    ? "text-primary font-semibold"
                    : isStepCompleted(3)
                    ? "text-green-500"
                    : "text-muted-foreground"
                }`}
              >
                <span className="hidden lg:block">Choose Payment Method</span>
              </span>
            </div>
          </div>

          {/* Step 1: Delivery Address Form */}
          {step === 1 && (
            <form
              onSubmit={form.onSubmit(async (values) => {
                await saveAddress({ ...values, active: true }, user._id)
                  .then((res) => {
                    setAddress(res.addresses);
                    toast.success("Successfully added address");
                    router.refresh();
                    nextStep();
                  })
                  .catch((err) => {
                    console.log(err);
                    toast.error(err);
                  });
              })}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName">First Name</label>
                  <Input
                    id="firstName"
                    placeholder="First Name"
                    {...form.getInputProps("firstName")}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName">Last Name</label>
                  <Input
                    id="lastName"
                    placeholder="Last Name"
                    {...form.getInputProps("lastName")}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone">Phone Number</label>
                <Input
                  id="phone"
                  placeholder="Phone Number"
                  {...form.getInputProps("phoneNumber")}
                  required
                />
              </div>
              <div>
                <label htmlFor="state">State</label>
                <Input
                  id="state"
                  placeholder="State"
                  {...form.getInputProps("state")}
                  required
                />
              </div>
              <div>
                <label htmlFor="city">City</label>
                <Input
                  id="city"
                  placeholder="City"
                  {...form.getInputProps("city")}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="zipCode">Zip Code / Postal Code</label>
                  <Input
                    id="zipCode"
                    placeholder="Zip Code / Postal Code"
                    {...form.getInputProps("zipCode")}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="address1">Address 1</label>
                <Input
                  id="address1"
                  placeholder="Address 1"
                  {...form.getInputProps("address1")}
                  required
                />
              </div>
              <div>
                <label htmlFor="address2">Address 2</label>
                <Input
                  id="address2"
                  placeholder="Address 2"
                  {...form.getInputProps("address2")}
                  required
                />
              </div>
              <div>
                <label htmlFor="country">Country</label>
                <Input
                  id="country"
                  placeholder="Country"
                  {...form.getInputProps("country")}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Save Address
              </Button>
            </form>
          )}

          {/* Step 2: Apply Coupon */}
          {step === 2 && (
            <form
              onSubmit={(e) => {
                applyCouponHandler(e);
              }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold mb-4">Apply Coupon</h2>
              <div>
                <Label htmlFor="coupon">Coupon Code</Label>
                <Input
                  onChange={(e: any) => setCoupon(e.target.value)}
                  id="coupon"
                  placeholder="Enter coupon code"
                  required
                />
              </div>
              <Button type="submit">
                {couponLoading ? (
                  <div className="flex gap-[10px]">
                    <Loader className="animate-spin" /> Loading...
                  </div>
                ) : (
                  "Apply Coupon"
                )}
              </Button>
              {couponError && (
                <span className={" text-red-500"}>{couponError}</span>
              )}
            </form>
          )}

          {/* Step 3: Choose Payment */}
          {step === 3 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold mb-4">
                Choose Payment Method
              </h2>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod">Cash on Delivery (COD)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="razorpay" id="razorpay" />
                  <Label htmlFor="razorpay">Razorpay</Label>
                </div>
              </RadioGroup>
            </form>
          )}

          <div className="mt-6 flex justify-between">
            {step > 1 && (
              <Button onClick={prevStep} variant="outline">
                Previous
              </Button>
            )}
            {step < 3 && (
              <Button onClick={nextStep} className="ml-auto">
                Continue
              </Button>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full bg-gray-100 lg:w-1/3  lg:sticky top-[1rem] self-start">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {data.products?.map((i: any, index: number) => (
                <div className="flex items-center space-x-4" key={index}>
                  <img
                    src={i.image}
                    alt={i.name}
                    className="w-20 h-20 object-cover"
                  />
                  <div>
                    <h3 className="font-medium text-sm">{i.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Size: {i.size}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {i.qty}
                    </p>
                    <p className="font-semibold text-sm">
                      ₹ {i.price} * {i.qty} = ₹{i.price * i.qty}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between">
                <span>
                  Subtotal ({data && data?.products?.length}{" "}
                  {data && data?.products?.length === 1 ? "Item" : "Items"}):
                </span>
                <span>
                  <strong>₹ {carttotal}</strong>
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Cart Discount:</span>
                <span>
                  <strong>- ₹ {totalSaved}</strong>
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Shipping Charges:</span>
                <span>Free</span>
              </div>
              <div
                className={`flex justify-between ${
                  totalAfterDiscount !== ""
                    ? "text-sm"
                    : "text-lg font-semibold"
                }`}
              >
                <span>
                  {" "}
                  {totalAfterDiscount !== ""
                    ? "Total: "
                    : "Total before :"}{" "}
                </span>
                <span>₹ {data?.cartTotal}</span>
              </div>
              <div className="mt-[10px] flex flex-col gap-[5px] ">
                {/* <span className="bg-[#eeeeee75] p-[5px] text-[14px] border border-[#cccccc17]  ">
                {coupon === "" ? "Total: " : "Total before :"}
                <b>₹ {cart.cartTotal}</b>
              </span> */}
                {discount > 0 && (
                  <span className="discount bg-green-700 text-white p-[5px] text-[14px] border flex justify-between border-[#cccccc17]  ">
                    Coupon applied :{" "}
                    <b className="text-[15px] ">- {discount}%</b>
                  </span>
                )}
                {totalAfterDiscount < data?.cartTotal &&
                  totalAfterDiscount != "" && (
                    <span className=" p-[5px] text-lg flex justify-between border border-[#cccccc17]  ">
                      Total after Discount :{" "}
                      <b className="text-[15px] ">₹ {totalAfterDiscount}</b>
                    </span>
                  )}
              </div>
            </div>

            <Button
              onClick={() => placeOrderHandler()}
              disabled={isDisabled}
              className={`mt-[1rem] flex justify-center pt-[10px] gap-[10px] disabled:bg-[#ccc]  w-full h-[45px] bg-green-700 text-white ${
                isDisabled ? "bg-theme_light cursor-not-allowed" : ""
              }`}
            >
              {placeOrderLoading ? (
                <div className="flex gap-[10px]">
                  <Loader className="animate-spin" /> Loading...
                </div>
              ) : (
                buttonText()
              )}
              <FaArrowAltCircleRight size={25} color="white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
