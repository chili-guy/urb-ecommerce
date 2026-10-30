import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useAddresses, useCheckoutPay, useInstallmentSettings, useProfile, previewCoupon } from "@/lib/api";
import { DEFAULT_INSTALLMENT_SETTINGS, maxInstallments } from "@/lib/installments";
import { FunctionHttpError } from "@/lib/functions";
import { formatCurrency } from "@/lib/utils";
import { formatCep, lookupCep, normalizeCep } from "@/lib/cep";
import { useShippingQuote } from "@/lib/shipping";
import {
  formatCardExpiry,
  formatCardNumber,
  formatCpfCnpj,
  formatPhone,
  isValidCardNumber,
  isValidCpfCnpj,
  isValidEmail,
  isValidPhone,
  onlyDigits,
} from "@/lib/br-docs";
import { trackBeginCheckout } from "@/lib/analytics";
import type { Address, CouponPreview, PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Loader2, Lock, MapPin, QrCode, Tag, X } from "lucide-react";
import { toast } from "sonner";

function shortAddress(a: Address): string {
  return [
    [a.street, a.number].filter(Boolean).join(", "),
    a.district,
    [a.city, a.state].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(" · ");
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold sm:mb-4 sm:text-xl">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
      {children}
    </h3>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile } = useProfile(!!user);
  const { data: addresses } = useAddresses(!!user);
  const checkoutPay = useCheckoutPay();

  // identificação
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");

  // endereço
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // pagamento
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);

  // cupom
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponPreview | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Uma chave por tentativa: reenvio/clique duplo cai no mesmo pedido em vez de cobrar 2x.
  const attemptKey = useRef(crypto.randomUUID());

  const quoteItems = useMemo(
    () => items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
    [items],
  );
  const quote = useShippingQuote(cep, quoteItems);
  const shippingOptions = quote.data?.options ?? [];
  const [selectedShipping, setSelectedShipping] = useState("");

  // Seleciona a opção mais barata sozinho; se a escolhida sumir numa nova cotação, volta pra ela.
  useEffect(() => {
    if (shippingOptions.length === 0) return;
    setSelectedShipping((cur) => (shippingOptions.some((o) => o.id === cur) ? cur : shippingOptions[0].id));
  }, [shippingOptions]);

  // Dispara o evento de início de checkout uma vez, quando a página abre com itens.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || items.length === 0) return;
    checkoutTracked.current = true;
    trackBeginCheckout(
      items.map((i) => ({ id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity })),
      subtotal,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pré-preenche com os dados da conta (podem chegar depois da montagem).
  useEffect(() => {
    if (!user) return;
    setName((v) => v || user.name);
    setEmail((v) => v || user.email || "");
  }, [user]);
  useEffect(() => {
    if (!profile) return;
    setPhone((v) => v || (profile.phone ? formatPhone(profile.phone) : ""));
    setCep((v) => v || (profile.postalCode ? formatCep(profile.postalCode) : ""));
  }, [profile]);

  // CEP completo preenche rua, bairro, cidade e UF (só o que ainda está vazio).
  const lastLookedUp = useRef("");
  useEffect(() => {
    const digits = normalizeCep(cep);
    if (digits.length !== 8 || digits === lastLookedUp.current) return;
    lastLookedUp.current = digits;
    setCepLoading(true);
    lookupCep(digits).then((found) => {
      setCepLoading(false);
      if (!found) return;
      setStreet((v) => v || found.street);
      setDistrict((v) => v || found.district);
      setCity((v) => v || found.city);
      setState((v) => v || found.state);
    });
  }, [cep]);

  const selectSavedAddress = (a: Address) => {
    setSelectedAddressId(a.id);
    lastLookedUp.current = normalizeCep(a.postalCode); // já temos os dados: não precisa consultar de novo
    setCep(formatCep(a.postalCode));
    setStreet(a.street);
    setNumber(a.number);
    setComplement(a.complement ?? "");
    setDistrict(a.district);
    setCity(a.city);
    setState(a.state);
    if (a.recipient) setName((v) => v || a.recipient);
  };

  // Seleciona o endereço padrão na primeira carga.
  const addressPrefilled = useRef(false);
  useEffect(() => {
    if (addressPrefilled.current || !addresses || addresses.length === 0) return;
    addressPrefilled.current = true;
    selectSavedAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const result = await previewCoupon(couponCode, subtotal);
    setCouponLoading(false);
    setCouponResult(result);
    if (!result.valid) toast.error(result.reason);
    else toast.success(`Cupom ${result.code} aplicado`);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
  };

  const discount = couponResult?.valid ? couponResult.discount : 0;
  const selectedOption = shippingOptions.find((o) => o.id === selectedShipping);
  const total = Math.max(subtotal + (selectedOption?.price ?? 0) - discount, 0);

  const { data: installmentSettings = DEFAULT_INSTALLMENT_SETTINGS } = useInstallmentSettings();
  const installmentOptions = useMemo(() => {
    const max = maxInstallments(total, installmentSettings);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [total, installmentSettings]);
  useEffect(() => {
    setInstallments((n) => Math.min(n, installmentOptions.length));
  }, [installmentOptions]);

  /** Primeira coisa errada no formulário, ou null se está tudo certo. */
  const firstProblem = (): string | null => {
    if (name.trim().split(/\s+/).length < 2) return "Informe nome e sobrenome.";
    if (!isValidEmail(email)) return "E-mail inválido.";
    if (!isValidCpfCnpj(cpf)) return "CPF ou CNPJ inválido.";
    if (!isValidPhone(phone)) return "Telefone inválido. Use DDD + número.";
    if (normalizeCep(cep).length !== 8) return "CEP inválido.";
    if (!street.trim() || !number.trim() || !district.trim() || !city.trim() || state.trim().length !== 2) {
      return "Complete o endereço de entrega (rua, número, bairro, cidade e UF).";
    }
    if (!selectedOption) return "Escolha uma opção de frete.";
    if (method === "credit_card") {
      if (!isValidCardNumber(cardNumber)) return "Número do cartão inválido.";
      if (cardName.trim().length < 3) return "Informe o nome impresso no cartão.";
      const [mm, yy] = cardExpiry.split("/");
      const month = Number(mm);
      const year = Number(yy) + 2000;
      const now = new Date();
      if (!mm || !yy || yy.length !== 2 || month < 1 || month > 12) return "Validade do cartão inválida (MM/AA).";
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return "Cartão vencido.";
      if (onlyDigits(cardCvv).length < 3) return "Código de segurança (CVV) inválido.";
    }
    return null;
  };

  const handleCheckout = () => {
    if (checkoutPay.isPending) return;
    const problem = firstProblem();
    if (problem || !selectedOption) {
      toast.error(problem ?? "Escolha uma opção de frete.");
      return;
    }
    const [mm, yy] = cardExpiry.split("/");

    checkoutPay.mutate(
      {
        items: quoteItems,
        shippingServiceId: selectedOption.id,
        customer: { name: name.trim(), email: email.trim(), cpfCnpj: onlyDigits(cpf), phone: onlyDigits(phone) },
        address: {
          postalCode: normalizeCep(cep),
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim(),
          district: district.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
        },
        couponCode: couponResult?.valid ? couponResult.code : null,
        paymentMethod: method,
        installments: method === "credit_card" ? installments : 1,
        card:
          method === "credit_card"
            ? { holderName: cardName.trim(), number: onlyDigits(cardNumber), expiryMonth: mm, expiryYear: yy, ccv: onlyDigits(cardCvv) }
            : undefined,
        idempotencyKey: attemptKey.current,
      },
      {
        onSuccess: (result) => {
          clearCart();
          if (result.unconfirmed) {
            toast.info("Não conseguimos confirmar o pagamento ainda. Acompanhe pelo pedido: se for aprovado, ele é atualizado sozinho.");
          }
          setLocation(`/pedido/${result.orderId}`);
        },
        onError: (error) => {
          // O servidor respondeu "não": nada ficou pendente, então a próxima tentativa é uma compra nova.
          if (error instanceof FunctionHttpError) attemptKey.current = crypto.randomUUID();
          toast.error(error instanceof Error ? error.message : "Erro ao processar o pagamento.");
        },
      },
    );
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Seu carrinho está vazio</h2>
        <Button asChild>
          <Link href="/catalogo">Voltar à loja</Link>
        </Button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="container mx-auto flex justify-center px-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <Lock className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="mb-2 font-display text-2xl font-bold">Entre para finalizar a compra</h1>
        <p className="mb-6 text-muted-foreground">
          Com a sua conta você acompanha o pedido, o pagamento e a entrega. Seu carrinho fica guardado.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/entrar?next=/checkout">Entrar</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/cadastrar">Criar conta</Link>
          </Button>
        </div>
      </div>
    );
  }

  const cpfDigits = onlyDigits(cpf);
  const cpfInvalid = cpfDigits.length >= 11 && !isValidCpfCnpj(cpf);
  const payLabel = method === "pix" ? `Pagar ${formatCurrency(total)} com Pix` : `Pagar ${formatCurrency(total)}`;

  return (
    <div className="container mx-auto px-4 pb-28 pt-6 sm:pt-8 lg:pb-12">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight sm:mb-8 sm:text-3xl">Finalizar Pedido</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-6 sm:space-y-8 lg:col-span-7">
          <section>
            <StepTitle n={1}>Identificação</StepTitle>
            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 sm:p-6">
              <Field label="Nome completo" className="sm:col-span-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" autoComplete="name" />
              </Field>
              <Field label="E-mail">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="joao@exemplo.com" autoComplete="email" />
              </Field>
              <Field label="Celular / telefone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-8888"
                  inputMode="tel"
                  autoComplete="tel-national"
                />
              </Field>
              <Field label="CPF ou CNPJ" className="sm:col-span-2">
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  aria-invalid={cpfInvalid}
                  className={cpfInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {cpfInvalid && <p className="text-xs text-destructive">CPF ou CNPJ inválido.</p>}
              </Field>
            </div>
          </section>

          <section>
            <StepTitle n={2}>Entrega</StepTitle>
            <div className="space-y-5 rounded-lg border bg-card p-4 sm:space-y-6 sm:p-6">
              {addresses && addresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Endereços salvos</p>
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                        selectedAddressId === a.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-secondary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        checked={selectedAddressId === a.id}
                        onChange={() => selectSavedAddress(a)}
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary focus:ring-primary"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {a.label}
                          {a.isDefault && <span className="text-[11px] font-normal text-primary">(padrão)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{shortAddress(a)} · CEP {formatCep(a.postalCode)}</div>
                      </div>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm hover:bg-secondary/50">
                    <input
                      type="radio"
                      name="saved-address"
                      checked={selectedAddressId === null}
                      onChange={() => setSelectedAddressId(null)}
                      className="h-4 w-4 shrink-0 text-primary focus:ring-primary"
                    />
                    Entregar em outro endereço
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                <Field label="CEP" className="sm:col-span-2">
                  <div className="relative">
                    <Input
                      value={cep}
                      onChange={(e) => {
                        setCep(formatCep(e.target.value));
                        setSelectedAddressId(null);
                      }}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                      autoComplete="postal-code"
                    />
                    {cepLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                  </div>
                </Field>
                <Field label="Rua" className="sm:col-span-4">
                  <Input value={street} onChange={(e) => { setStreet(e.target.value); setSelectedAddressId(null); }} autoComplete="address-line1" />
                </Field>
                <Field label="Número" className="sm:col-span-2">
                  <Input value={number} onChange={(e) => { setNumber(e.target.value); setSelectedAddressId(null); }} placeholder="123 ou S/N" />
                </Field>
                <Field label="Complemento (opcional)" className="sm:col-span-4">
                  <Input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apto, bloco, referência" autoComplete="address-line2" />
                </Field>
                <Field label="Bairro" className="sm:col-span-3">
                  <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
                </Field>
                <Field label="Cidade" className="sm:col-span-2">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                </Field>
                <Field label="UF" className="sm:col-span-1">
                  <Input value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="SP" />
                </Field>
              </div>

              <div className="space-y-3 border-t pt-4">
                <p className="mb-2 text-sm font-medium">Opções de frete</p>
                {normalizeCep(cep).length !== 8 && (
                  <p className="text-sm text-muted-foreground">Informe o CEP para ver as opções de frete.</p>
                )}
                {quote.isFetching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculando o frete...
                  </div>
                )}
                {quote.isError && !quote.isFetching && (
                  <div className="space-y-2 text-sm">
                    <p className="text-destructive">{quote.error instanceof Error ? quote.error.message : "Não foi possível calcular o frete."}</p>
                    <Button variant="outline" size="sm" onClick={() => quote.refetch()}>
                      Tentar de novo
                    </Button>
                  </div>
                )}
                {!quote.isFetching &&
                  shippingOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors sm:p-4 ${
                        selectedShipping === option.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-secondary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={option.id}
                        checked={selectedShipping === option.id}
                        onChange={(e) => setSelectedShipping(e.target.value)}
                        className="h-4 w-4 shrink-0 border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{option.carrier} — {option.service}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.deliveryDays > 0 ? `${option.deliveryDays} dias úteis` : "Prazo a confirmar"} · {option.description}
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-sm font-medium">
                        {option.price === 0 ? "Grátis" : formatCurrency(option.price)}
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          </section>

          <section>
            <StepTitle n={3}>Pagamento</StepTitle>
            <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: "pix", label: "Pix", hint: "Aprovação na hora", Icon: QrCode },
                    {
                      id: "credit_card",
                      label: "Cartão de crédito",
                      hint:
                        installmentSettings.maxInterestFree > 1
                          ? `Em até ${installmentSettings.maxInterestFree}x sem juros`
                          : "À vista",
                      Icon: CreditCard,
                    },
                  ] as const
                ).map(({ id, label, hint, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    className={`flex items-center gap-3 rounded-md border p-4 text-left transition-colors ${
                      method === id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="h-6 w-6 shrink-0 text-primary" />
                    <div>
                      <div className="text-sm font-semibold">{label}</div>
                      <div className="text-xs text-muted-foreground">{hint}</div>
                    </div>
                  </button>
                ))}
              </div>

              {method === "pix" ? (
                <p className="text-sm text-muted-foreground">
                  Depois de confirmar, mostramos o QR Code e o código "copia e cola". O pedido é confirmado assim que o
                  pagamento cair, e o estoque fica reservado por 30 minutos.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Número do cartão" className="sm:col-span-2">
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                        autoComplete="cc-number"
                      />
                    </Field>
                    <Field label="Nome impresso no cartão" className="sm:col-span-2">
                      <Input value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} autoComplete="cc-name" />
                    </Field>
                    <Field label="Validade (MM/AA)">
                      <Input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                        placeholder="05/30"
                        inputMode="numeric"
                        maxLength={5}
                        autoComplete="cc-exp"
                      />
                    </Field>
                    <Field label="CVV">
                      <Input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(onlyDigits(e.target.value).slice(0, 4))}
                        placeholder="123"
                        inputMode="numeric"
                        maxLength={4}
                        autoComplete="cc-csc"
                      />
                    </Field>
                  </div>
                  <Field label="Parcelamento">
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {installmentOptions.map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? `À vista ${formatCurrency(total)}` : `${n}x de ${formatCurrency(total / n)} sem juros`}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    O titular do cartão deve ser quem compra (CPF informado acima). Os dados do cartão vão direto, com
                    segurança, ao processador de pagamentos e não ficam salvos na loja.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-lg border bg-card lg:sticky lg:top-24">
            <div className="border-b bg-secondary/30 p-4 sm:p-6">
              <h3 className="font-display text-lg font-bold">Resumo do Pedido</h3>
            </div>

            <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4 text-sm">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-white">
                      <img src={item.product.imageUrl} className="h-full w-full object-contain p-1 mix-blend-multiply" alt="" />
                    </div>
                    <div className="flex-1">
                      <div className="line-clamp-2 font-medium">{item.product.name}</div>
                      <div className="text-muted-foreground">Qtd: {item.quantity}</div>
                    </div>
                    <div className="font-mono font-medium">{formatCurrency(item.product.price * item.quantity)}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Cupom de desconto</p>
                {couponResult?.valid ? (
                  <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-primary">
                      <Tag className="h-3.5 w-3.5" /> {couponResult.code}
                    </span>
                    <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-foreground" aria-label="Remover cupom">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Código do cupom"
                      className="h-10"
                    />
                    <Button variant="secondary" className="shrink-0" onClick={handleApplyCoupon} disabled={couponLoading}>
                      {couponLoading ? "..." : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t pt-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Desconto ({couponResult?.valid ? couponResult.code : ""})</span>
                    <span className="font-mono">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-mono">{selectedOption ? formatCurrency(selectedOption.price) : "---"}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-end justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-mono text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="hidden h-12 w-full text-base lg:flex"
                onClick={handleCheckout}
                disabled={checkoutPay.isPending || !selectedOption}
              >
                {checkoutPay.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                  </>
                ) : (
                  payLabel
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra fixa de checkout no mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center gap-4">
          <div className="shrink-0">
            <div className="text-[11px] text-muted-foreground">Total</div>
            <div className="font-mono text-lg font-bold text-primary">{formatCurrency(total)}</div>
          </div>
          <Button size="lg" className="h-12 flex-1 text-base" onClick={handleCheckout} disabled={checkoutPay.isPending || !selectedOption}>
            {checkoutPay.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
              </>
            ) : !selectedOption ? (
              "Informe o CEP"
            ) : method === "pix" ? (
              "Pagar com Pix"
            ) : (
              "Pagar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
